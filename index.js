const ffmpeg = require('fluent-ffmpeg');
const Case = require('case');

const { config } = require('dotenv');
config();

const fs = require('fs');
const path = require('path');

const llmGenerate = require('./openai.js');
const getAudio = require('./tts.js');

// Set the path to the FFmpeg binary
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

const INPUT_FOLDER = './audio_input';
const OUTPUT_FOLDER = './audio_output';
const TEMP_FOLDER = './temp';
const TRANSCRIPTS_FOLDER = './transcripts';
const MUSIC_FILEPATH = './music/intro.mp3';

const changeAudioSpeed = (inputPath, outputPath, speed) => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioFilters(`atempo=${speed}`)
            .output(outputPath)
            .on('end', () => {
                console.log(
                    `Audio file successfully slowed. File: ${inputPath}. Output: ${outputPath}. Speed: ${speed}`
                );
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('An error occurred:', err.message);
                reject(err);
            })
            .run();
    });
};

const addSilence = (inputPath, outputPath, silenceDurationSec) => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioFilters(`apad=pad_dur=${silenceDurationSec}`)
            .on('end', () => {
                console.log(
                    `Silence successfully added to the end of the audio file. File: ${inputPath}. Output: ${outputPath}. Silence: ${silenceDurationSec}s`
                );
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('An error occurred:', err.message);
                reject(err);
            })
            .save(outputPath);
    });
};

const concatenateFiles = (inputPaths, outputFolder, tempFolder) => {
    return new Promise((resolve, reject) => {
        const concatProcess = ffmpeg();

        // Add intro music
        concatProcess.input(MUSIC_FILEPATH);

        inputPaths.forEach((file) => {
            concatProcess.input(file);
        });

        // Also add intro music to end
        concatProcess.input(MUSIC_FILEPATH);

        const outputPath = path.join(outputFolder, `final.mp3`);

        concatProcess
            .on('end', () => {
                console.log(
                    `Concatenation completed successfully. Output path: ${outputPath}`
                );
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error(
                    'An error occurred during concatenation:',
                    err.message
                );
                reject(err);
            })
            .mergeToFile(outputPath, outputFolder, tempFolder);
    });
};

const extractNumberFromFilename = (filename) => {
    const match = filename.match(/_(\d+)_/); // Match the number in the format _number_
    return match ? parseInt(match[1], 10) : 0;
};

const extractLanguageFromFilename = (filename) => {
    const match = filename.match(/_(en|sp)/); // Match the language code _en or _sp
    return match ? match[1] : '';
};

const sortFilesAsc = (fileA, fileB) => {
    const numA = extractNumberFromFilename(fileA);
    const numB = extractNumberFromFilename(fileB);
    const langA = extractLanguageFromFilename(fileA);
    const langB = extractLanguageFromFilename(fileB);

    // Sort by number (ascending)
    if (numA !== numB) {
        return numA - numB;
    }

    // If numbers are the same, prioritize 'sp' before 'en'
    if (langA !== langB) {
        return langA === 'sp' ? -1 : 1; // 'sp' comes before 'en'
    }

    return 0; // If both number and language are the same, keep original order
};

const mergeAndProcessAudioFiles = async (
    inputFolder,
    outputFolder,
    tempFolder
) => {
    const files = fs
        .readdirSync(inputFolder)
        .filter((file) => file.endsWith('.mp3'))
        .sort(sortFilesAsc);

    // Process all files (change speed)
    const slowedPaths_en_sp = await Promise.all(
        files.map(async (file) => {
            const inputPath = path.join(inputFolder, file);
            const outputPathSlowed = path.join(tempFolder, `slowed_${file}`);
            const language = extractLanguageFromFilename(file);
            const speed = language === 'sp' ? 0.85 : 1.0;
            await changeAudioSpeed(inputPath, outputPathSlowed, speed);
            return outputPathSlowed;
        })
    );

    // Add silence to Spanish files
    const spanishFilesWithSilence = await Promise.all(
        slowedPaths_en_sp
            .filter(
                (file) =>
                    extractLanguageFromFilename(path.basename(file)) === 'sp'
            )
            .map(async (file) => {
                const outputPathWithSilence = path.join(
                    tempFolder,
                    `short_silence_${path.basename(file)}`
                );
                await addSilence(file, outputPathWithSilence, 1);
                return outputPathWithSilence;
            })
    );

    const spanishSlowMergedShortSilencePath = path.join(
        tempFolder,
        'spanish_slow_merged_short_silence.mp3'
    );
    await mergeFiles(
        spanishFilesWithSilence,
        spanishSlowMergedShortSilencePath
    );

    // Clean up Spanish files with short silence
    spanishFilesWithSilence.forEach((file) => fs.unlinkSync(file));

    const slowSilencePaths_en_sp = await Promise.all(
        slowedPaths_en_sp.map(async (file) => {
            const outputPathWithSilence = path.join(
                tempFolder,
                `silence_${path.basename(file)}`
            );
            await addSilence(file, outputPathWithSilence, 1.75);
            return outputPathWithSilence;
        })
    );

    // Clean up slowed files
    slowedPaths_en_sp.forEach((file) => fs.unlinkSync(file));

    const slowSilenceMergedPath_en_sp = path.join(
        tempFolder,
        `slow_silence_merged_en_sp.mp3`
    );
    await mergeFiles(slowSilencePaths_en_sp, slowSilenceMergedPath_en_sp);

    // Clean up files with silence
    slowSilencePaths_en_sp.forEach((file) => fs.unlinkSync(file));

    const finalOutputPath = path.join(outputFolder, `final_output.mp3`);

    await mergeFiles(
        [
            MUSIC_FILEPATH,
            spanishSlowMergedShortSilencePath,
            slowSilenceMergedPath_en_sp,
            MUSIC_FILEPATH,
        ],
        finalOutputPath
    );

    // Clean up final temporary files
    fs.unlinkSync(spanishSlowMergedShortSilencePath);
    fs.unlinkSync(slowSilenceMergedPath_en_sp);

    return finalOutputPath;
};

const mergeFiles = (inputPaths, outputPath) => {
    return new Promise((resolve, reject) => {
        const concatProcess = ffmpeg();

        if (!Array.isArray(inputPaths) || inputPaths.length === 0) {
            return reject(new Error('Invalid or empty input paths array'));
        }

        inputPaths.forEach((file) => {
            if (typeof file !== 'string' || file.trim() === '') {
                return reject(new Error(`Invalid input path: ${file}`));
            }
            concatProcess.input(file);
        });

        concatProcess
            .on('end', () => {
                console.log(
                    `Concatenation completed successfully. Output path: ${outputPath}`
                );
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error(
                    'An error occurred during concatenation:',
                    err.message
                );
                reject(err);
            })
            .mergeToFile(outputPath, path.dirname(outputPath));
    });
};

const getAudioFiles = async (outputFolder) => {
    const storyJSON = await llmGenerate();
    const storyObj = JSON.parse(storyJSON);
    const storyTitle = storyObj['title']['english'];

    const transcriptPath = `${TRANSCRIPTS_FOLDER}/${Case.snake(
        storyTitle
    )}.json`;
    fs.writeFileSync(transcriptPath, storyJSON, 'utf8', (err) => {
        if (err) {
            console.error(`Error writing to file:`, err);
        } else {
            console.log(`File saved to ${transcriptPath}`);
        }
    });

    const storyArr = storyObj['story'];
    for (let i = 0; i < storyArr.length; i++) {
        // for (let i = 0; i < 2; i++) {
        const { english, spanish } = storyArr[i];
        const fileNameEnglish = path.join(
            outputFolder,
            `${Case.snake(storyTitle)}_audio_${i}_en.mp3`
        );
        const fileNameSpanish = path.join(
            outputFolder,
            `${Case.snake(storyTitle)}_audio_${i}_sp.mp3`
        );
        // Spanish first
        const outputPathSpanish = await getAudio(spanish, fileNameSpanish);
        const outputPathEnglish = await getAudio(english, fileNameEnglish);

        console.log({ outputPathEnglish, outputPathSpanish });
    }
};

const execute = async () => {
    // await getAudioFiles(INPUT_FOLDER);
    await mergeAndProcessAudioFiles(INPUT_FOLDER, OUTPUT_FOLDER, TEMP_FOLDER);
};

execute();
