const { ElevenLabsClient } = require('elevenlabs');
const fs = require('fs');

const client = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_APIKEY,
});

const createAudioFileFromText = async (text, fileName) => {
    const VOICE_JHENNNY_SPANISH_FEMALE = '2Lb1en5ujrODDIqmp7F3'; // Jhenny Antiques - Calm, Soft and Sweet
    // const VOICE_LUIS_SPANISH_MALE = 'KuCuu213C5LmCbAvbEb8'; // Luis - Spanish Male. This one is not good
    const MODEL_ID = 'eleven_multilingual_v2';

    return new Promise(async (resolve, reject) => {
        try {
            const audio = await client.generate({
                voice: VOICE_JHENNNY_SPANISH_FEMALE,
                model_id: MODEL_ID,
                text,
                voice_settings: {
                    stability: 0.3,
                    similarity_boost: 0.7,
                    style: 0.6,
                    use_speaker_boost: true,
                },
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
