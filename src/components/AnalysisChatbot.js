import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  Tooltip,
  Fab
} from '@mui/material';
import { Send as SendIcon, Chat as ChatIcon, DragIndicator } from '@mui/icons-material';
import OpenAI from 'openai';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
import { supabase } from '../supabaseClient';

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// Componente para tornar o Dialog draggable
function PaperComponent(props) {
  return (
    <Draggable
      handle="#draggable-dialog-title"
      cancel={'[class*="MuiDialogContent-root"]'}
    >
      <Paper {...props} />
    </Draggable>
  );
}

const AnalysisChatbot = ({ stats, substance }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [size, setSize] = useState({ width: 500, height: 600 });
  const [open, setOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mensagem inicial quando o chat é aberto
  useEffect(() => {
    if (open && messages.length === 0 && substance) {
      setMessages([{
        role: 'assistant',
        content: `Olá! Estou aqui para ajudar com a análise do medicamento ${substance}. 
                 \nEstatísticas atuais:
                 - Preço médio: R$ ${stats.general.mean.toFixed(2)}
                 - Preço mediano: R$ ${stats.general.median.toFixed(2)}
                 - Menor preço: R$ ${stats.general.min.toFixed(2)}
                 - Maior preço: R$ ${stats.general.max.toFixed(2)}
                 \nVocê pode me perguntar sobre:
                 - Análise de preços e variações
                 - Comparações entre apresentações
                 - Análise por fabricante
                 - Recomendações de compra`
      }]);
    }
  }, [open, substance, messages.length, stats]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      console.log('Iniciando processamento da mensagem...');
      console.log('Substance:', substance);
      console.log('Stats:', stats);

      // Verificar se o cliente Supabase está disponível
      if (!supabase) {
        throw new Error('Cliente Supabase não está inicializado');
      }

      console.log('Buscando dados vetorizados...');
      const { data: vectorData, error: vectorError } = await supabase.rpc(
        'get_substance_vector_analysis',
        { p_substance: substance }
      );

      if (vectorError) {
        console.error('Erro ao buscar dados vetorizados:', vectorError);
        throw new Error(`Erro ao buscar dados vetorizados: ${vectorError.message}`);
      }

      console.log('Dados vetorizados recebidos:', vectorData);

      // Preparar o contexto para o OpenAI
      const analysisContext = `
        Analisando o medicamento ${substance}:
        
        Estatísticas Gerais:
        - Total de registros: ${vectorData.general_stats.total_registros}
        - Preço médio: R$ ${vectorData.general_stats.preco_medio}
        - Preço mediano: R$ ${vectorData.general_stats.preco_mediano}
        - Menor preço: R$ ${vectorData.general_stats.preco_minimo}
        - Maior preço: R$ ${vectorData.general_stats.preco_maximo}
        - Desvio padrão: R$ ${vectorData.general_stats.desvio_padrao}
        
        Análise por Apresentação:
        ${vectorData.presentations.map(pres => `
          ${pres.apresentacao}:
          - Quantidade: ${pres.quantidade} produtos
          - Preço médio: R$ ${pres.preco_medio}
          - Menor preço: R$ ${pres.preco_minimo}
          - Maior preço: R$ ${pres.preco_maximo}
          - Desvio padrão: R$ ${pres.desvio_padrao}
        `).join('\n')}
        
        Análise por Fabricante:
        ${vectorData.manufacturers.map(mfr => `
          ${mfr.laboratorio}:
          - Quantidade: ${mfr.quantidade_produtos} produtos
          - Preço médio: R$ ${mfr.preco_medio}
          - Menor preço: R$ ${mfr.preco_minimo}
          - Maior preço: R$ ${mfr.preco_maximo}
        `).join('\n')}
        
        Análise por Tipo:
        ${vectorData.types.map(type => `
          ${type.tipo}:
          - Quantidade: ${type.quantidade} produtos
          - Preço médio: R$ ${type.preco_medio}
          - Menor preço: R$ ${type.preco_minimo}
          - Maior preço: R$ ${type.preco_maximo}
        `).join('\n')}
      `;

      console.log('Enviando requisição para OpenAI...');
      
      // Verificar se a chave da API está disponível
      if (!process.env.REACT_APP_OPENAI_API_KEY) {
        throw new Error('Chave da API OpenAI não está configurada');
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em análise de preços de medicamentos no Brasil.
                     Use os dados fornecidos para:
                     1. Analisar preços e suas variações
                     2. Comparar diferentes apresentações
                     3. Avaliar diferenças entre fabricantes
                     4. Identificar oportunidades de economia
                     5. Fornecer recomendações práticas
                     
                     Seja conciso e direto nas respostas, focando nos aspectos mais relevantes para o usuário.
                     Use valores monetários formatados em reais (R$).
                     
                     Se houver algum erro ou dado faltante, explique isso ao usuário de forma clara.`
          },
          {
            role: "user",
            content: `${analysisContext}\n\nPergunta do usuário: ${userMessage}`
          }
        ],
      });

      console.log('Resposta recebida da OpenAI');
      const botResponse = completion.choices[0].message.content;
      setMessages(prev => [...prev, { role: 'assistant', content: botResponse }]);
    } catch (error) {
      console.error('Erro detalhado:', error);
      let errorMessage = 'Desculpe, ocorreu um erro ao processar sua pergunta.';
      
      if (error.message.includes('API OpenAI')) {
        errorMessage = 'Erro de configuração: A chave da API OpenAI não está configurada corretamente.';
      } else if (error.message.includes('Supabase')) {
        errorMessage = 'Erro de banco de dados: Não foi possível acessar os dados necessários.';
      }
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `${errorMessage} Por favor, tente novamente ou contate o suporte se o problema persistir.`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleResize = (e, { size }) => {
    setSize({ width: size.width, height: size.height });
  };

  return (
    <>
      <Fab
        color="primary"
        aria-label="chat"
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 1000
        }}
      >
        <ChatIcon />
      </Fab>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        PaperComponent={PaperComponent}
        aria-labelledby="draggable-dialog-title"
        maxWidth={false}
      >
        <ResizableBox
          width={size.width}
          height={size.height}
          onResize={handleResize}
          minConstraints={[300, 400]}
          maxConstraints={[800, 800]}
        >
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <DialogTitle 
              id="draggable-dialog-title"
              sx={{
                cursor: 'move',
                backgroundColor: 'primary.main',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DragIndicator />
                <Typography>Assistente de Análise - {substance}</Typography>
              </Box>
              <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'white' }}>
                ✕
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {messages.map((msg, index) => (
                  <Box
                    key={index}
                    sx={{
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      backgroundColor: msg.role === 'user' ? 'primary.main' : 'grey.100',
                      color: msg.role === 'user' ? 'white' : 'text.primary',
                      p: 1,
                      borderRadius: 2,
                      maxWidth: '80%'
                    }}
                  >
                    <Typography variant="body2">{msg.content}</Typography>
                  </Box>
                ))}
                {isLoading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
                    <CircularProgress size={20} />
                  </Box>
                )}
                <div ref={messagesEndRef} />
              </Box>
            </DialogContent>

            <Box sx={{ p: 2, backgroundColor: 'background.paper' }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Digite sua pergunta..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                size="small"
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={handleSend} disabled={isLoading}>
                      <SendIcon />
                    </IconButton>
                  )
                }}
              />
            </Box>
          </Box>
        </ResizableBox>
      </Dialog>
    </>
  );
};

export default AnalysisChatbot;
