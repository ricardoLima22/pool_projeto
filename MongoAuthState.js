/**
 * Hook nativo para injeção de estado no Baileys (Substitui o useMultiFileAuthState)
 * Compatível exatamente com o uso de `collection` root.
 */
async function useMongoDBAuthState(collection) {
    // Dynamic import to support ESM format required by newer Baileys versions
    const baileys = await import('@whiskeysockets/baileys');
    const { BufferJSON, initAuthCreds } = baileys;
    const { proto } = await import('@whiskeysockets/baileys/WAProto');

    const writeData = async (data, id) => {
        try {
            const jsonStr = JSON.stringify(data, BufferJSON.replacer);
            const jsonObj = JSON.parse(jsonStr);
            await collection.replaceOne(
                { _id: id },
                { _id: id, data: jsonObj },
                { upsert: true }
            );
        } catch (error) {
            console.error(`Erro ao gravar auth para a chave ${id}:`, error);
        }
    };

    const readData = async (id) => {
        try {
            const doc = await collection.findOne({ _id: id });
            if (doc && doc.data) {
                const jsonStr = JSON.stringify(doc.data);
                return JSON.parse(jsonStr, BufferJSON.reviver);
            }
        } catch (error) {
            console.error(`Erro ao ler auth para a chave ${id}:`, error);
        }
        return null;
    };

    const removeData = async (id) => {
        try {
            await collection.deleteOne({ _id: id });
        } catch (error) {
            console.error(`Erro ao deletar auth da chave ${id}:`, error);
        }
    };

    let creds = await readData('creds');
    if (!creds) {
        creds = initAuthCreds();
        await writeData(creds, 'creds');
    }

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) {
                                tasks.push(writeData(value, key));
                            } else {
                                tasks.push(removeData(key));
                            }
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => {
            return writeData(creds, 'creds');
        }
    };
}

module.exports = { useMongoDBAuthState };
