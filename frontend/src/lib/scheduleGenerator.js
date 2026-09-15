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

/**
 * Garante que todos os clientes com dias de limpeza configurados em customer_cleaning_days
 * possuam agendamentos em cleaning_schedules para o mês atual (ou especificado).
 */
export async function garantirAgendaMesEmpresa(companyId, ano = null, mes = null) {
    if (!companyId) return;

    try {
        const agora = new Date();
        const targetAno = ano !== null ? ano : agora.getFullYear();
        const targetMes = mes !== null ? mes : agora.getMonth(); // 0 = Jan, 11 = Dez

        const primeiroDia = new Date(targetAno, targetMes, 1);
        const ultimoDia = new Date(targetAno, targetMes + 1, 0);

        const inicioStr = `${targetAno}-${String(targetMes + 1).padStart(2, '0')}-01`;
        const fimStr = `${targetAno}-${String(targetMes + 1).padStart(2, '0')}-${String(ultimoDia.getDate()).padStart(2, '0')}`;

        // 1. Buscar todos os clientes da empresa
        const { data: clientes, error: custError } = await supabase
            .from('customers')
            .select('id, funcionario_id')
            .eq('company_id', companyId);

        if (custError || !clientes || clientes.length === 0) return;

        const customerMap = {};
        const customerIds = clientes.map(c => {
            customerMap[c.id] = c;
            return c.id;
        });

        // 2. Buscar configurações de dias de limpeza dos clientes
        const { data: cleaningDays, error: daysError } = await supabase
            .from('customer_cleaning_days')
            .select('customer_id, dia_semana, funcionario_id')
            .in('customer_id', customerIds);

        if (daysError || !cleaningDays || cleaningDays.length === 0) return;

        // 3. Buscar agendamentos já existentes para a empresa no mês
        const { data: existentes, error: existError } = await supabase
            .from('cleaning_schedules')
            .select('customer_id, data_agendada')
            .eq('company_id', companyId)
            .gte('data_agendada', inicioStr)
            .lte('data_agendada', fimStr);

        if (existError) return;

        const existingSet = new Set((existentes || []).map(e => `${e.customer_id}_${e.data_agendada}`));

        // 4. Montar lista de datas necessárias
        const novosAgendamentos = [];

        const clientConfig = {};
        cleaningDays.forEach(item => {
            if (!clientConfig[item.customer_id]) {
                const cust = customerMap[item.customer_id];
                clientConfig[item.customer_id] = {
                    funcionarioId: item.funcionario_id || cust?.funcionario_id || null,
                    dias: []
                };
            }
            clientConfig[item.customer_id].dias.push(item.dia_semana);
        });

        for (const [custId, config] of Object.entries(clientConfig)) {
            for (let d = new Date(primeiroDia); d <= ultimoDia; d.setDate(d.getDate() + 1)) {
                const dayOfWeek = d.getDay();
                if (config.dias.includes(dayOfWeek)) {
                    const yearStr = d.getFullYear();
                    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
                    const dateStr = String(d.getDate()).padStart(2, '0');
                    const dataFormatada = `${yearStr}-${monthStr}-${dateStr}`;

                    const key = `${custId}_${dataFormatada}`;
                    if (!existingSet.has(key)) {
                        novosAgendamentos.push({
                            customer_id: custId,
                            company_id: companyId,
                            funcionario_id: config.funcionarioId,
                            data_agendada: dataFormatada,
                            status: 'pendente'
                        });
                        existingSet.add(key);
                    }
                }
            }
        }

        if (novosAgendamentos.length > 0) {
            for (let i = 0; i < novosAgendamentos.length; i += 100) {
                const batch = novosAgendamentos.slice(i, i + 100);
                await supabase.from('cleaning_schedules').insert(batch);
            }
        }
    } catch (err) {
        console.error('Erro em garantirAgendaMesEmpresa:', err);
    }
}
