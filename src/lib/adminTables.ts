export type FieldType = 'text' | 'number' | 'date' | 'boolean' | 'select';

export type TableField = {
  key: string;
  label: string;
  type: FieldType;
  editable?: boolean;
  nullable?: boolean;
  placeholder?: string;
  step?: string;
  options?: Array<{ label: string; value: string }>;
};

export type AdminTableConfig = {
  table: string;
  title: string;
  description: string;
  primaryKey: string;
  orderBy?: Array<{ column: string; ascending?: boolean }>;
  fields: TableField[];
  createRow: () => Record<string, unknown>;
};

const currentYear = new Date().getFullYear();

export const adminTableConfigs: AdminTableConfig[] = [
  {
    table: 'ir_parametros',
    title: 'IR parametros',
    description: 'Anos, teto do simplificado e inicio de correcao usados no ajuste anual.',
    primaryKey: 'ano_calendario',
    orderBy: [{ column: 'ano_calendario', ascending: false }],
    fields: [
      { key: 'ano_calendario', label: 'Ano calendario', type: 'number' },
      { key: 'teto', label: 'Teto', type: 'number', step: '0.01' },
      { key: 'inicio_correcao', label: 'Inicio da correcao', type: 'date' },
    ],
    createRow: () => ({
      ano_calendario: currentYear,
      teto: 0,
      inicio_correcao: '',
    }),
  },
  {
    table: 'ir_faixas',
    title: 'IR faixas',
    description: 'Faixas por ano calendario, com aliquota e deducao.',
    primaryKey: 'id',
    orderBy: [
      { column: 'ano_calendario', ascending: false },
      { column: 'limite_inferior', ascending: true },
    ],
    fields: [
      { key: 'ano_calendario', label: 'Ano calendario', type: 'number' },
      { key: 'limite_inferior', label: 'Limite inferior', type: 'number', step: '0.01' },
      { key: 'limite_superior', label: 'Limite superior', type: 'number', step: '0.01', nullable: true, placeholder: 'Sem limite' },
      { key: 'aliquota', label: 'Aliquota', type: 'number', step: '0.001' },
      { key: 'deducao', label: 'Deducao', type: 'number', step: '0.01' },
    ],
    createRow: () => ({
      ano_calendario: currentYear,
      limite_inferior: 0,
      limite_superior: null,
      aliquota: 0,
      deducao: 0,
    }),
  },
  {
    table: 'salario_minimo',
    title: 'Salario minimo',
    description: 'Historico de salario minimo por data de referencia.',
    primaryKey: 'id',
    orderBy: [{ column: 'data_ref', ascending: false }],
    fields: [
      { key: 'data_ref', label: 'Data de referencia', type: 'date' },
      { key: 'valor', label: 'Valor', type: 'number', step: '0.01' },
    ],
    createRow: () => ({
      data_ref: '',
      valor: 0,
    }),
  },
  {
    table: 'indices_economicos',
    title: 'Indices economicos',
    description: 'Cadastro base dos indices usados por correcao e juros.',
    primaryKey: 'id',
    orderBy: [{ column: 'sigla', ascending: true }],
    fields: [
      { key: 'sigla', label: 'Sigla', type: 'text' },
      { key: 'descricao', label: 'Descricao', type: 'text', nullable: true },
      {
        key: 'natureza',
        label: 'Natureza',
        type: 'select',
        options: [
          { label: 'Correcao', value: 'CORRECAO' },
          { label: 'Juros', value: 'JUROS' },
        ],
      },
    ],
    createRow: () => ({
      sigla: '',
      descricao: '',
      natureza: 'CORRECAO',
    }),
  },
  {
    table: 'taxas_historicas',
    title: 'Taxas historicas',
    description: 'Serie mensal ou anual por indice, incluindo percentual e fatores.',
    primaryKey: 'id',
    orderBy: [{ column: 'data_referencia', ascending: false }],
    fields: [
      { key: 'id_indice', label: 'Indice', type: 'select' },
      { key: 'data_referencia', label: 'Data referencia', type: 'date' },
      { key: 'valor_percentual', label: 'Valor percentual', type: 'number', step: '0.000001' },
      { key: 'fator_multiplicador', label: 'Fator multiplicador', type: 'number', step: '0.0000000001', editable: false },
      { key: 'fator_acumulado', label: 'Fator acumulado', type: 'number', step: '0.000000000001', editable: false },
    ],
    createRow: () => ({
      id_indice: '',
      data_referencia: '',
      valor_percentual: 0,
      fator_multiplicador: null,
      fator_acumulado: null,
    }),
  },
  {
    table: 'templates_calculo',
    title: 'Templates de calculo',
    description: 'Modelos de calculo auxiliares e sua ativacao.',
    primaryKey: 'id',
    orderBy: [{ column: 'nome', ascending: true }],
    fields: [
      { key: 'nome', label: 'Nome', type: 'text' },
      { key: 'descricao', label: 'Descricao', type: 'text', nullable: true },
      { key: 'ativo', label: 'Ativo', type: 'boolean' },
    ],
    createRow: () => ({
      nome: '',
      descricao: '',
      ativo: true,
    }),
  },
  {
    table: 'regras_subperiodo',
    title: 'Regras de subperiodo',
    description: 'Regras vinculadas ao template, com indices e ordem de aplicacao.',
    primaryKey: 'id',
    orderBy: [{ column: 'ordem', ascending: true }],
    fields: [
      { key: 'id_template', label: 'Template', type: 'select' },
      { key: 'data_inicio_vigencia', label: 'Inicio vigencia', type: 'date', nullable: true },
      { key: 'data_fim_vigencia', label: 'Fim vigencia', type: 'date', nullable: true },
      { key: 'id_indice_correcao', label: 'Indice correcao', type: 'select', nullable: true },
      { key: 'id_indice_juros', label: 'Indice juros', type: 'select', nullable: true },
      {
        key: 'tipo_juros',
        label: 'Tipo juros',
        type: 'select',
        nullable: true,
        options: [
          { label: 'Simples', value: 'SIMPLES' },
          { label: 'Composto', value: 'COMPOSTO' },
        ],
      },
      { key: 'aplicar_correcao', label: 'Aplicar correcao', type: 'boolean' },
      { key: 'aplicar_juros', label: 'Aplicar juros', type: 'boolean' },
      { key: 'ordem', label: 'Ordem', type: 'number' },
    ],
    createRow: () => ({
      id_template: '',
      data_inicio_vigencia: '',
      data_fim_vigencia: '',
      id_indice_correcao: '',
      id_indice_juros: '',
      tipo_juros: 'SIMPLES',
      aplicar_correcao: true,
      aplicar_juros: true,
      ordem: 1,
    }),
  },
];
