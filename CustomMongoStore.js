const fs = require('fs');
const path = require('path');

class CustomMongoStore {
    constructor({ mongoose }) {
        if (!mongoose) throw new Error('A valid Mongoose instance is required for MongoStore.');
        this.mongoose = mongoose;
    }

    async sessionExists(options) {
        const sessionName = path.basename(options.session);
        let multiDeviceCollection = this.mongoose.connection.db.collection(`whatsapp-${sessionName}.files`);
        let hasExistingSession = await multiDeviceCollection.countDocuments();
        return !!hasExistingSession;
    }

    async save(options) {
        const sessionName = path.basename(options.session);
        var bucket = new this.mongoose.mongo.GridFSBucket(this.mongoose.connection.db, {
            bucketName: `whatsapp-${sessionName}`
        });
        await new Promise((resolve, reject) => {
            fs.createReadStream(`${options.session}.zip`)
                .pipe(bucket.openUploadStream(`${sessionName}.zip`))
                .on('error', err => reject(err))
                .on('close', () => resolve());
        });
        options.bucket = bucket;
        options.sessionName = sessionName;
        await this.#deletePrevious(options);
    }

    async extract(options) {
        const sessionName = path.basename(options.session);
        var bucket = new this.mongoose.mongo.GridFSBucket(this.mongoose.connection.db, {
            bucketName: `whatsapp-${sessionName}`
        });
        
        return new Promise((resolve, reject) => {
            // CRIAR DIRETÓRIO PAI SE ELE NÃO EXISTIR
            if (options.path) {
                const dir = path.dirname(options.path);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
            }

            bucket.openDownloadStreamByName(`${sessionName}.zip`)
                .pipe(fs.createWriteStream(options.path))
                .on('error', err => reject(err))
                .on('close', () => resolve());
        });
    }

    async delete(options) {
        const sessionName = path.basename(options.session);
        var bucket = new this.mongoose.mongo.GridFSBucket(this.mongoose.connection.db, {
            bucketName: `whatsapp-${sessionName}`
        });
        const documents = await bucket.find({
            filename: `${sessionName}.zip`
        }).toArray();
        documents.map(async doc => {
            return bucket.delete(doc._id);
        });
    }

    async #deletePrevious(options) {
        const documents = await options.bucket.find({
            filename: `${options.sessionName}.zip`
        }).toArray();
        if (documents.length > 1) {
            const oldSession = documents.reduce((a, b) => a.uploadDate < b.uploadDate ? a : b);
            return options.bucket.delete(oldSession._id);
        }
    }
}

module.exports = CustomMongoStore;
