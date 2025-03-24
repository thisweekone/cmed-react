import React, { useState } from 'react';
import { Alert, Button, Collapse } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import SupabaseErrorTips from './SupabaseErrorTips';

/**
 * Componente reutilizável para exibir erros de SQL com diagnóstico e link para correção
 */
const SqlErrorHelper = ({ error, functionName, additionalInfo }) => {
  const [showDebug, setShowDebug] = useState(false);
  
  // Diagnóstico baseado na mensagem de erro
  const getErrorDiagnosis = (errorMessage, funcName) => {
    if (!errorMessage) return "Erro desconhecido";
    
    const diagnoses = [
      {
        pattern: /column reference .* is ambiguous/i,
        solution: `A função ${funcName} tem referências ambíguas a colunas. É necessário qualificar a coluna com o nome da tabela usando aliases.`
      },
      {
        pattern: /column .* does not exist/i,
        solution: `A função ${funcName} referencia uma coluna que não existe na tabela. Verifique o nome correto da coluna.`
      },
      {
        pattern: /function .* does not exist/i,
        solution: `A função ${funcName} não existe no banco de dados. Verifique se ela foi criada corretamente.`
      },
      {
        pattern: /permission denied/i,
        solution: `Permissão negada para acessar ou modificar dados. Verifique as permissões da função ${funcName}.`
      },
      {
        pattern: /syntax error/i,
        solution: `Erro de sintaxe na definição da função ${funcName}. Verifique a sintaxe SQL.`
      }
    ];
    
    for (const { pattern, solution } of diagnoses) {
      if (pattern.test(errorMessage)) {
        return solution;
      }
    }
    
    return `Erro na função ${funcName}. Verifique os logs para mais detalhes.`;
  };
  
  if (!error) return null;
  
  const errorMessage = typeof error === 'string' ? error : (error.message || error.toString());
  const errorDetail = typeof error === 'object' ? error.detail || error.hint || '' : '';
  const errorCode = typeof error === 'object' && error.code ? error.code : null;
  const diagnosis = getErrorDiagnosis(errorMessage, functionName);

  return (
    <Alert variant="danger">
      <Alert.Heading>Erro ao executar {functionName}</Alert.Heading>
      <p>{errorMessage}</p>
      
      <p>
        <strong>Diagnóstico: </strong> {diagnosis}
      </p>
      
      {/* Removida referência à página de diagnóstico */}
      Verifique os logs do console para mais detalhes sobre o erro.
      
      <Button
        onClick={() => setShowDebug(!showDebug)}
        aria-controls="sql-error-details"
        aria-expanded={showDebug}
        variant="outline-danger"
        size="sm"
      >
        {showDebug ? 'Ocultar' : 'Exibir'} detalhes técnicos
      </Button>
      
      <Collapse in={showDebug}>
        <div id="sql-error-details" className="mt-3">
          <Alert variant="light" className="p-2 border">
            <p className="mb-2"><strong>Detalhes do erro:</strong></p>
            <pre className="bg-light p-2" style={{fontSize: '0.8rem'}}>
              {JSON.stringify(error, null, 2)}
            </pre>
            
            {errorDetail && (
              <p><strong>Informação adicional: </strong> {errorDetail}</p>
            )}
            
            {additionalInfo && (
              <div className="mt-2">
                <strong>Dicas para correção:</strong>
                <ul className="mt-1">
                  {Array.isArray(additionalInfo) 
                    ? additionalInfo.map((tip, idx) => <li key={idx}>{tip}</li>)
                    : <li>{additionalInfo}</li>
                  }
                </ul>
              </div>
            )}
            
            {errorCode && <SupabaseErrorTips errorCode={errorCode} />}
            
            <div className="mt-3">
              <p><strong>Passos para correção:</strong></p>
              <ol>
                <li>Verifique os logs do console para mais detalhes</li>
                <li>Verifique o status da função {functionName}</li>
                <li>Utilize o script <code>analises_avancadas_simplificadas_v2.sql</code> para aplicar as correções</li>
              </ol>
            </div>
          </Alert>
        </div>
      </Collapse>
    </Alert>
  );
};

export default SqlErrorHelper;
