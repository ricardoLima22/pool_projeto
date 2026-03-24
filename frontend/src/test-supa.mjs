import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vnnvjoykfdqpbnjlebkh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZubnZqb3lrZmRxcGJuamxlYmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1MTYyNDksImV4cCI6MjA1ODA5MjI0OX0.4uODlS1Nof-aU-1zZY42Z2j2SlsW9M_i08sY4wH70Fw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Buscando cliente...');
  const { data: c } = await supabase.from('customers').select('*').limit(1);
  console.log('Customer:', c?.[0]?.id);
  
  console.log('Buscando perfil...');
  const { data: p } = await supabase.from('profiles').select('*').limit(1);
  console.log('Profile:', p?.[0]?.id);
  
  console.log('Buscando servico...');
  const { data: s } = await supabase.from('service_types').select('*').limit(1);
  console.log('Service:', s?.[0]?.id);

  if (!c?.[0] || !p?.[0] || !s?.[0]) {
     console.log('Faltando dados!');
     return;
  }
  
  console.log('Iniciando insercao...');
  const { error } = await supabase.from('service_requests').insert([{
    company_id: c[0].company_id,
    customer_id: c[0].id,
    piscineiro_id: p[0].id,
    service_type_id: s[0].id,
    scheduled_date: new Date().toISOString(),
    description: 'Teste',
    status: 'Pendente'
  }]);
  console.log('ERRO DO SUPABASE ===>', error);
}

test();
