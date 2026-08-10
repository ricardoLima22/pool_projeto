import { supabase } from './supabase';

/**
 * Mapeamento dos dias da semana (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
 */
export const DIAS_SEMANA = [
    { id: 1, label: 'Seg', fullName: 'Segunda-feira' },
    { id: 2, label: 'Ter', fullName: 'Terça-feira' },
    { id: 3, label: 'Qua', fullName: 'Quarta-feira' },
    { id: 4, label: 'Qui', fullName: 'Quinta-feira' },
    { id: 5, label: 'Sex', fullName: 'Sexta-feira' },
    { id: 6, label: 'Sáb', fullName: 'Sábado' },
    { id: 0, label: 'Dom', fullName: 'Domingo' },
];

/**
 * Gerar agendamentos na tabela `cleaning_schedules` para um cliente
 * com base nos dias da semana selecionados (0 a 6) para o mês atual (ou especificado).
 */
export async function gerarAgendaCliente(customerId, companyId, funcionarioId, diasSemana, ano = null, mes = null) {
    if (!customerId || !diasSemana || diasSemana.length === 0) return;

    const agora = new Date();
    const targetAno = ano !== null ? ano : agora.getFullYear();
    const targetMes = mes !== null ? mes : agora.getMonth(); // 0 = Jan, 11 = Dez

    // Primeiro dia e último dia do mês
    const primeiroDia = new Date(targetAno, targetMes, 1);
    const ultimoDia = new Date(targetAno, targetMes + 1, 0);

    const datasAgendadas = [];

    for (let d = new Date(primeiroDia); d <= ultimoDia; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay(); // 0 a 6
        if (diasSemana.includes(dayOfWeek)) {
            // Formatar YYYY-MM-DD em fuso local
            const yearStr = d.getFullYear();
            const monthStr = String(d.getMonth() + 1).padStart(2, '0');
            const dateStr = String(d.getDate()).padStart(2, '0');
            const dataFormatada = `${yearStr}-${monthStr}-${dateStr}`;

            datasAgendadas.push({
                customer_id: customerId,
                company_id: companyId || null,
                funcionario_id: funcionarioId || null,
                data_agendada: dataFormatada,
                status: 'pendente',
            });
        }
    }

    if (datasAgendadas.length === 0) return;

    // Buscar agendamentos existentes no período para evitar duplicatas
    const inicioStr = `${targetAno}-${String(targetMes + 1).padStart(2, '0')}-01`;
    const fimStr = `${targetAno}-${String(targetMes + 1).padStart(2, '0')}-${String(ultimoDia.getDate()).padStart(2, '0')}`;

    const { data: existentes } = await supabase
        .from('cleaning_schedules')
        .select('data_agendada')
        .eq('customer_id', customerId)
        .gte('data_agendada', inicioStr)
        .lte('data_agendada', fimStr);

    const datasExistentesSet = new Set((existentes || []).map((e) => e.data_agendada));

    // Filtrar apenas as novas datas não agendadas ainda
    const novasDatas = datasAgendadas.filter((item) => !datasExistentesSet.has(item.data_agendada));

    if (novasDatas.length > 0) {
        await supabase.from('cleaning_schedules').insert(novasDatas);
    }
}
