const { ElevenLabsClient } = require('elevenlabs');
const fs = require('fs');

const client = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_APIKEY,
});

const createAudioFileFromText = async (text, fileName) => {
    const VOICE = '2Lb1en5ujrODDIqmp7F3'; // Jhenny Antiques - Calm, Soft and Sweet
    const MODEL_ID = 'eleven_multilingual_v2';

    return new Promise(async (resolve, reject) => {
        try {
            const audio = await client.generate({
                voice: VOICE,
                model_id: MODEL_ID,
                text,
            });
            const fileStream = fs.createWriteStream(fileName);
            audio.pipe(fileStream);
            fileStream.on('finish', () => resolve(fileName));
            fileStream.on('error', reject);
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = createAudioFileFromText;
