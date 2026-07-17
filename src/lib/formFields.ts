export interface FormField {
  id: string; key: string; label: string;
  type: 'text'|'number'|'date'|'url'|'textarea'|'select';
  required: boolean; visible: boolean;
  custom?: boolean; options?: string[];
}

// Built-in fields of the employee Submit Work form
export const DEFAULT_FIELDS: FormField[] = [
  { id:'f1', key:'projects',        label:'Projects',              type:'select',   required:true,  visible:true },
  { id:'f2', key:'dateCompleted',   label:'Date Completed',        type:'date',     required:true,  visible:true },
  { id:'f3', key:'hours',           label:'Total Hours',           type:'number',   required:true,  visible:true },
  { id:'f4', key:'requestedAmount', label:'Requested Amount',      type:'number',   required:true,  visible:true },
  { id:'f5', key:'currency',        label:'Payment Currency',      type:'select',   required:true,  visible:true },
  { id:'f6', key:'workLink',        label:'Work Link / File Link', type:'url',      required:false, visible:true },
  { id:'f7', key:'description',     label:'Description',           type:'textarea', required:false, visible:true },
];
