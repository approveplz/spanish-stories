const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const videoshow = require('videoshow');
const ffmpeg = require('fluent-ffmpeg');

const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

async function createImageWithDynamicText(
    text,
    frameNumber,
    outputFolder,
    backgroundImagePath = null // Make backgroundImagePath optional
) {
    const width = 1920;
    const height = 1080;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (backgroundImagePath) {
        // Load and draw the background image if provided
        const backgroundImage = await loadImage(backgroundImagePath);
        ctx.drawImage(backgroundImage, 0, 0, width, height);
    } else {
        // Use yellow background if no image path is provided
        ctx.fillStyle = 'yellow';
        ctx.fillRect(0, 0, width, height);
    }

    // Set a fixed font size
    const fontSize = 80;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = 'white'; // Changed to white for better visibility on images
    ctx.strokeStyle = 'black'; // Add an outline to make text more readable
    ctx.lineWidth = 4; // Increase the line width for a thicker outline
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const wrapText = (
        context,
        text,
        centerX,
        centerY,
        maxWidth,
        lineHeight
    ) => {
        const words = text.split(' ');
        let currentLine = '';
        const wrappedLines = [];

        words.forEach((word) => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const { width: testWidth } = context.measureText(testLine);

            if (testWidth > maxWidth && currentLine) {
                wrappedLines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });
        if (currentLine) {
            wrappedLines.push(currentLine);
        }

        const totalTextHeight = wrappedLines.length * lineHeight;
        const startY = centerY - totalTextHeight / 2;

        wrappedLines.forEach((line, index) => {
            const lineY = startY + index * lineHeight;
            context.strokeText(line, centerX, lineY);
            context.fillText(line, centerX, lineY);
        });
    };

    const lineHeight = fontSize * 1.2;
    wrapText(ctx, text, width / 2, height / 2, width * 0.8, lineHeight);

    const filePath = path.join(outputFolder, `frame-${frameNumber}.png`);
    fs.writeFileSync(filePath, canvas.toBuffer('image/png'));
    return filePath;
}

async function createVideoFromImagesAndAudio(
    imagePaths,
    audioPath,
    durations,
    outputFolder
) {
    const outputFileName = `output-video.mp4`;
    const outputPath = path.join(outputFolder, outputFileName);

    // Create image objects for videoshow
    const videoshowImageObjs = imagePaths.map((imagePath, index) => ({
        path: imagePath,
        loop: durations[index],
    }));

    const videoOptions = {
        fps: 30,
        transition: false,
        videoBitrate: 1024,
        videoCodec: 'libx264',
        size: '1920x1080',
        outputOptions: ['-preset ultrafast', '-pix_fmt yuv420p'],
        format: 'mp4',
    };

    console.log('Starting video generation...');
    console.log('Images:', imagePaths);
    console.log('Audio file:', audioPath);
    console.log('Output:', outputPath);

    return new Promise((resolve, reject) => {
        videoshow(videoshowImageObjs, videoOptions)
            .audio(audioPath, { fade: false })
            .save(outputPath)
            .on('start', (command) => {
                console.log('FFmpeg process started:', command);
            })
            .on('error', (err, stdout, stderr) => {
                console.error('Error:', err);
                console.error('ffmpeg stderr:', stderr);
                reject(err);
            })
            .on('end', (output) => {
                console.log('Video created successfully:', output);
                resolve(outputPath);
            });
    });
}

module.exports = {
    createImageWithDynamicText,
    createVideoFromImagesAndAudio,
};
