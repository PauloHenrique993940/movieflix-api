import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default tseslint.config(
  // Arquivos e pastas que o ESLint deve ignorar
  {
    ignores: ['dist/**', 'node_modules/**', 'package-lock.json'],
  },
  // Configurações recomendadas para JavaScript e TypeScript
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Configurações recomendadas de estilo (espaços, aspas, etc)
  stylistic.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node, // Permite o uso de variáveis globais do Node.js
      },
    },
    rules: {
      'no-console': 'off', // Permite o uso de console.log sem avisos
      '@stylistic/indent': ['error', 2], // Força o uso de 2 espaços para indentação
      '@stylistic/quotes': ['error', 'single'], // Força o uso de aspas simples
      '@stylistic/semi': ['error', 'always'], // Força o uso de ponto e vírgula
      '@stylistic/no-multi-spaces': 'error', // Não permite múltiplos espaços seguidos
    },
  },
);
