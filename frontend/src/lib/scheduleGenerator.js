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
 * Retorna o dia da semana (0=Dom..6=Sab) para uma data "YYYY-MM-DD"
 * sem risco de drift de fuso horário.
 */
function getDayOfWeek(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
}

/**
 * Data local de hoje no formato "YYYY-MM-DD".
 */
export function getHojeStr(agora = new Date()) {
    const y = agora.getFullYear();
    const m = String(agora.getMonth() + 1).padStart(2, '0');
    const d = String(agora.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Início e fim do dia LOCAL convertidos para ISO (UTC), para filtrar colunas timestamptz.
 * Ex.: no Brasil (UTC-3), 17/10 vira 2026-10-17T03:00:00.000Z até 2026-10-18T03:00:00.000Z (exclusivo).
 */
export function getLimitesDiaLocalISO(agora = new Date()) {
    const inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
    return { inicioISO: inicio.toISOString(), fimISO: fim.toISOString() };
}

/**
 * Remove agendamentos PENDENTES, sem visita vinculada, de hoje em diante,
 * cujo dia da semana não está mais configurado para o cliente.
 * Evita que um cliente que mudou de dia continue aparecendo no dia antigo.
 *
 * @param {Array} agendamentos - linhas com { id, customer_id, data_agendada, status, visit_id }
 * @param {Object} diasPorCliente - { [customer_id]: Set<number> | number[] }
 */
async function removerAgendamentosOrfaos(agendamentos, diasPorCliente) {
    const hojeStr = getHojeStr();
    const idsRemover = (agendamentos || [])
        .filter((s) => {
            const data = String(s.data_agendada).slice(0, 10);
            if (data < hojeStr) return false;
            if (s.visit_id) return false;
            if ((s.status || '').toLowerCase() !== 'pendente') return false;
            const dias = diasPorCliente[s.customer_id];
            const set = dias instanceof Set ? dias : new Set(dias || []);
            return !set.has(getDayOfWeek(data));
        })
        .map((s) => s.id);

    for (let i = 0; i < idsRemover.length; i += 100) {
        const batch = idsRemover.slice(i, i + 100);
        const { error } = await supabase.from('cleaning_schedules').delete().in('id', batch);
        if (error) console.error('Erro ao remover agendamentos órfãos:', error);
    }
}

/**
 * Sincroniza a agenda de um cliente após alterar seus dias de limpeza:
 * remove agendamentos pendentes futuros em dias que não são mais configurados.
 * Deve ser chamada mesmo quando o cliente fica sem nenhum dia.
 */
export async function sincronizarAgendaCliente(customerId, diasSemana) {
    if (!customerId) return;
    const { data: futuros, error } = await supabase
        .from('cleaning_schedules')
        .select('id, customer_id, data_agendada, status, visit_id')
        .eq('customer_id', customerId)
        .gte('data_agendada', getHojeStr());

    if (error) {
        console.error('Erro ao buscar agendamentos do cliente:', error);
        return;
    }
    await removerAgendamentosOrfaos(futuros, { [customerId]: diasSemana || [] });
}

/**
 * Gerar agendamentos na tabela `cleaning_schedules` para um cliente
 * com base nos dias da semana selecionados (0 a 6) para o mês atual (ou especificado).
 */
export async function gerarAgendaCliente(customerId, companyId, funcionarioId, diasSemana, ano = null, mes = null) {
    if (!customerId || !diasSemana || diasSemana.length === 0) return;

    const agora = new Date();
    const targetAno = ano !== null ? ano : agora.getFullYear();
    const targetMes = mes !== null ? mes : agora.getMonth(); // 0 = Jan, 11 = Dez

    const monthStr = String(targetMes + 1).padStart(2, '0');
    // Último dia do mês (número)
    const ultimoDiaNum = new Date(targetAno, targetMes + 1, 0).getDate();

    const inicioStr = `${targetAno}-${monthStr}-01`;
    const fimStr = `${targetAno}-${monthStr}-${String(ultimoDiaNum).padStart(2, '0')}`;

    const datasAgendadas = [];

    // ✅ Itera sobre números de dia — sem mutar objetos Date, sem drift de fuso
    for (let dia = 1; dia <= ultimoDiaNum; dia++) {
        const dataFormatada = `${targetAno}-${monthStr}-${String(dia).padStart(2, '0')}`;
        const dayOfWeek = getDayOfWeek(dataFormatada); // 0=Dom, 1=Seg...

        if (diasSemana.includes(dayOfWeek)) {
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

        const monthStr = String(targetMes + 1).padStart(2, '0');
        const ultimoDiaNum = new Date(targetAno, targetMes + 1, 0).getDate();

        const inicioStr = `${targetAno}-${monthStr}-01`;
        const fimStr = `${targetAno}-${monthStr}-${String(ultimoDiaNum).padStart(2, '0')}`;

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

        // 2. Buscar configurações de dias de limpeza dos clientes (paginado).
        //    Importante ler TUDO: se faltasse um dia de um cliente, a limpeza apagaria agendamentos válidos.
        const cleaningDays = [];
        for (let from = 0; ; from += 1000) {
            const { data: pagina, error: daysError } = await supabase
                .from('customer_cleaning_days')
                .select('id, customer_id, dia_semana, funcionario_id')
                .in('customer_id', customerIds)
                .order('id', { ascending: true })
                .range(from, from + 999);

            if (daysError) return;
            cleaningDays.push(...(pagina || []));
            if (!pagina || pagina.length < 1000) break;
        }

        if (cleaningDays.length === 0) return;

        // 3. Buscar agendamentos já existentes para a empresa no mês
        //    (paginado: o Supabase retorna no máximo 1000 linhas por consulta)
        const existentes = [];
        for (let from = 0; ; from += 1000) {
            const { data: pagina, error: existError } = await supabase
                .from('cleaning_schedules')
                .select('id, customer_id, data_agendada, status, visit_id')
                .eq('company_id', companyId)
                .gte('data_agendada', inicioStr)
                .lte('data_agendada', fimStr)
                .order('id', { ascending: true })
                .range(from, from + 999);

            if (existError) return;
            existentes.push(...(pagina || []));
            if (!pagina || pagina.length < 1000) break;
        }

        // 3.1 Remover agendamentos pendentes futuros em dias que o cliente não tem mais.
        //     Segurança: só considera clientes cuja configuração de dias foi efetivamente lida
        //     (se o RLS esconder a configuração de algum cliente, os agendamentos dele não são tocados).
        //     Clientes que ficaram sem nenhum dia são tratados em sincronizarAgendaCliente ao editar.
        const diasPorCliente = {};
        cleaningDays.forEach(item => {
            (diasPorCliente[item.customer_id] ||= new Set()).add(item.dia_semana);
        });
        const candidatosLimpeza = existentes.filter(
            e => customerMap[e.customer_id] && diasPorCliente[e.customer_id]
        );
        await removerAgendamentosOrfaos(candidatosLimpeza, diasPorCliente);

        const existingSet = new Set(
            existentes.map(e => `${e.customer_id}_${String(e.data_agendada).slice(0, 10)}`)
        );

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
            // ✅ Itera sobre números de dia — sem mutar objetos Date, sem drift de fuso
            for (let dia = 1; dia <= ultimoDiaNum; dia++) {
                const dataFormatada = `${targetAno}-${monthStr}-${String(dia).padStart(2, '0')}`;
                const dayOfWeek = getDayOfWeek(dataFormatada);

                if (config.dias.includes(dayOfWeek)) {
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
