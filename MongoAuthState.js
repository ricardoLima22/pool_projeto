const mongoose = require('mongoose');
const { BufferJSON, initAuthCreds } = require('@whiskeysockets/baileys');
const { proto } = require('@whiskeysockets/baileys/WAProto');

// Schema otimizado para não depender do disco
const AuthDataSchema = new mongoose.Schema({
    sessionId: { type: String, required: true },
    key: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed }
});

// Índice para garantir velocidade no "Get" por session_id + chave
AuthDataSchema.index({ sessionId: 1, key: 1 }, { unique: true });

// Previne overwrite de model se exportar várias vezes
const AuthDataModel = mongoose.models.WhatsAppSession || mongoose.model('WhatsAppSession', AuthDataSchema, 'whatsapp_sessions');

/**
 * Hook para injeção de estado no Baileys (Substitui o useMultiFileAuthState)
 */
async function useMongoDBAuthState(sessionId) {

    const writeData = async (data, key) => {
        try {
            const jsonStr = JSON.stringify(data, BufferJSON.replacer);
            const jsonObj = JSON.parse(jsonStr);
            await AuthDataModel.findOneAndUpdate(
                { sessionId, key },
                { $set: { data: jsonObj } },
                { upsert: true }
            );
        } catch (error) {
            console.error(`Erro ao gravar auth para a chave ${key}:`, error);
        }
    };

    const readData = async (key) => {
        try {
            const doc = await AuthDataModel.findOne({ sessionId, key }).lean();
            if (doc && doc.data) {
                const jsonStr = JSON.stringify(doc.data);
                return JSON.parse(jsonStr, BufferJSON.reviver);
            }
        } catch (error) {
            console.error(`Erro ao ler auth para a chave ${key}:`, error);
        }
        return null;
    };

    const removeData = async (key) => {
        try {
            await AuthDataModel.deleteOne({ sessionId, key });
        } catch (error) {
            console.error(`Erro ao deletar auth da chave ${key}:`, error);
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

module.exports = { useMongoDBAuthState, AuthDataModel };
