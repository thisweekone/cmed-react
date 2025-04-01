import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  IconButton,
  Collapse,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';

const AnalysisChatbot = ({ stats, substance }) => {
  const [messages, setMessages] = useState([
    {
      text: `Olá! Estou aqui para ajudar com análises sobre a substância "${substance}". O que você gostaria de saber?`,
      sender: 'bot'
    }
  ]);
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleSendMessage = () => {
    if (!input.trim()) return;

    // Adiciona a mensagem do usuário
    const userMessage = { text: input, sender: 'user' };
    setMessages([...messages, userMessage]);
    
    // Processa a resposta
    setTimeout(() => {
      const botResponse = generateResponse(input, stats, substance);
      setMessages(prev => [...prev, { text: botResponse, sender: 'bot' }]);
    }, 1000);
    
    setInput('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Paper sx={{ 
      p: { xs: 2, md: 3 }, 
      mb: 4, 
      borderRadius: 2, 
      boxShadow: 3,
      maxWidth: '100%',
      overflow: 'hidden'
    }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center">
          <AnalyticsIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" fontWeight="medium">
            Assistente de Análise
          </Typography>
        </Box>
        <IconButton onClick={toggleExpand} size="small" sx={{ borderRadius: 1, bgcolor: 'action.hover' }}>
          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      
      <Collapse in={isExpanded}>
        <List sx={{ 
          maxHeight: { xs: '250px', sm: '300px', md: '350px' }, 
          overflow: 'auto', 
          mb: 2,
          mt: 2,
          bgcolor: 'background.paper',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          p: 1
        }}>
          {messages.map((message, index) => (
            <React.Fragment key={index}>
              <ListItem alignItems="flex-start" sx={{ 
                justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                py: 1
              }}>
                {message.sender === 'bot' && (
                  <ListItemAvatar sx={{ minWidth: 42 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                      <BotIcon fontSize="small" />
                    </Avatar>
                  </ListItemAvatar>
                )}
                <ListItemText 
                  primary={
                    <Typography 
                      component="span" 
                      variant="body2" 
                      sx={{ 
                        display: 'inline', 
                        fontWeight: message.sender === 'bot' ? 'bold' : 'normal',
                        color: message.sender === 'bot' ? 'text.primary' : 'text.secondary'
                      }}
                    >
                      {message.sender === 'bot' ? 'Assistente' : 'Você'}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      component="span"
                      variant="body2"
                      sx={{ 
                        display: 'block',
                        bgcolor: message.sender === 'user' ? 'grey.100' : 'transparent',
                        p: message.sender === 'user' ? 1 : 0,
                        borderRadius: 1,
                        maxWidth: { xs: 220, sm: 300, md: 400 },
                        wordBreak: 'break-word'
                      }}
                    >
                      {message.text}
                    </Typography>
                  }
                  sx={{ 
                    margin: 0,
                    ...(message.sender === 'user' && { mr: 1 })
                  }}
                />
                {message.sender === 'user' && (
                  <ListItemAvatar sx={{ minWidth: 42 }}>
                    <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                      <PersonIcon fontSize="small" />
                    </Avatar>
                  </ListItemAvatar>
                )}
              </ListItem>
              {index < messages.length - 1 && <Divider variant="inset" component="li" />}
            </React.Fragment>
          ))}
        </List>
        
        <Box display="flex" flexDirection={isMobile ? 'column' : 'row'}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Digite sua pergunta sobre a análise..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            size="small"
            sx={{ 
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />
          <Button 
            variant="contained" 
            color="primary" 
            endIcon={<SendIcon />}
            onClick={handleSendMessage}
            sx={{ 
              ml: isMobile ? 0 : 1,
              mt: isMobile ? 1 : 0,
              borderRadius: 2,
              minWidth: isMobile ? '100%' : 120
            }}
          >
            Enviar
          </Button>
        </Box>
      </Collapse>
    </Paper>
  );
};

// Função para gerar respostas baseadas nas estatísticas
const generateResponse = (input, stats, substance) => {
  const inputLower = input.toLowerCase();
  
  // Verifica palavras-chave na pergunta
  if (inputLower.includes('preço médio') || inputLower.includes('média de preço')) {
    return `O preço médio dos medicamentos com a substância "${substance}" é R$ ${stats.general.mean.toFixed(2)}.`;
  }
  
  if (inputLower.includes('mais caro') || inputLower.includes('maior preço')) {
    return `O medicamento mais caro com a substância "${substance}" é "${stats.general.expensive.name}" com preço de R$ ${stats.general.expensive.price.toFixed(2)}.`;
  }
  
  if (inputLower.includes('mais barato') || inputLower.includes('menor preço')) {
    return `O medicamento mais barato com a substância "${substance}" é "${stats.general.cheapest.name}" com preço de R$ ${stats.general.cheapest.price.toFixed(2)}.`;
  }
  
  if (inputLower.includes('tipo') || inputLower.includes('categoria')) {
    const typeInfo = stats.byType.map(type => 
      `${type.tipo || 'Não especificado'}: preço médio R$ ${type.mean.toFixed(2)}`
    ).join('\n');
    return `Análise por tipos de medicamentos com a substância "${substance}":\n${typeInfo}`;
  }
  
  if (inputLower.includes('apresentação') || inputLower.includes('forma')) {
    const presentationInfo = stats.byPresentation.map(p => 
      `${p.apresentacao || 'Não especificada'}: preço médio R$ ${p.mean.toFixed(2)} (${p.count} produtos)`
    ).join('\n');
    return `Análise por apresentações de medicamentos com a substância "${substance}":\n${presentationInfo}`;
  }
  
  if (inputLower.includes('reajuste') || inputLower.includes('cmed')) {
    return `A comparação com o reajuste CMED para medicamentos com a substância "${substance}" mostra uma variação média de ${stats.general.adjustmentComparison.toFixed(2)}% em relação ao reajuste oficial.`;
  }
  
  // Resposta genérica se nenhuma palavra-chave for identificada
  return `Para a substância "${substance}", temos ${stats.byPresentation.reduce((acc, p) => acc + p.count, 0)} medicamentos cadastrados com preço médio de R$ ${stats.general.mean.toFixed(2)}. Você pode perguntar sobre preços médios, medicamentos mais caros/baratos, análise por tipo ou apresentação, ou comparação com reajustes CMED.`;
};

export default AnalysisChatbot;
