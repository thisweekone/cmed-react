-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Administrador sistemas', 'Operador', 'Usuário')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy for viewing users (all authenticated users can view)
CREATE POLICY "Users can view all users"
    ON users FOR SELECT
    TO authenticated
    USING (true);

-- Policy for inserting users (only admins)
CREATE POLICY "Only admins can create users"
    ON users FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Administrador sistemas'
        )
        OR NOT EXISTS (SELECT 1 FROM users) -- Permite a criação do primeiro usuário
    );

-- Policy for updating users (only admins)
CREATE POLICY "Only admins can update users"
    ON users FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Administrador sistemas'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Administrador sistemas'
        )
    );

-- Policy for deleting users (only admins)
CREATE POLICY "Only admins can delete users"
    ON users FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Administrador sistemas'
        )
    );

-- Função para criar o primeiro usuário admin
CREATE OR REPLACE FUNCTION create_first_admin(
    admin_email TEXT,
    admin_password TEXT,
    admin_name TEXT
)
RETURNS UUID AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Criar usuário na auth.users
    user_id := (
        SELECT id FROM auth.users 
        WHERE email = admin_email
        LIMIT 1
    );
    
    IF user_id IS NULL THEN
        user_id := gen_random_uuid();
        
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        )
        VALUES (
            user_id,
            admin_email,
            crypt(admin_password, gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{}',
            NOW(),
            NOW()
        );
    END IF;

    -- Inserir na tabela users
    INSERT INTO users (id, email, name, role)
    VALUES (user_id, admin_email, admin_name, 'Administrador sistemas')
    ON CONFLICT (id) DO UPDATE
    SET role = 'Administrador sistemas',
        name = admin_name;

    RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
