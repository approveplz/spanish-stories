// const dotenv = require('dotenv');
// dotenv.config();

const fs = require('fs');
const path = require('path');

async function uploadPodcast(title, mediaKeyPath, logoKeyPath, content) {
    try {
        console.log('Uploading podcast with media path:', mediaKeyPath);
        const accessToken = await getRefreshToken();

        const fileKeyMedia = await uploadAndGetFileKey(
            accessToken,
            mediaKeyPath,
            'audio/mpeg'
        );

        const fileKeyLogo = await uploadAndGetFileKey(
            accessToken,
            logoKeyPath,
            'image/jpeg'
        );

        console.log({ fileKeyLogo, fileKeyMedia });

        const url = 'https://api.podbean.com/v1/episodes';

        const formData = new URLSearchParams({
            access_token: accessToken,
            title: title,
            content: content,
            status: 'publish',
            type: 'public',
            media_key: fileKeyMedia,
            logo_key: fileKeyLogo,
            apple_episode_type: 'full',
            content_explicit: 'clean',
        });

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
            duplex: 'half',
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Error response body:', errorBody);
            throw new Error(
                `HTTP error! status: ${response.status}, body: ${errorBody}`
            );
        }

        const data = await response.json();
        console.log('Podcast uploaded successfully:', data);
        return data;
    } catch (error) {
        console.error('Error in uploadPodcast:', error);
        throw error;
    }
}

module.exports = uploadPodcast;

// Helper functions
// ----------------

async function getRefreshToken() {
    const url = 'https://api.podbean.com/v1/oauth/token';

    const headers = new Headers({
        'Content-Type': 'application/x-www-form-urlencoded',
    });

    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.PODBEAN_CLIENT_ID,
        client_secret: process.env.PODBEAN_CLIENT_SECRET,
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: body,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data.access_token) {
            throw new Error('Access token not found in response');
        }
        return data.access_token;
    } catch (error) {
        console.error('Error in getRefreshToken:', error);
        throw error;
    }
}

async function getUploadAuthorize(
    accessToken,
    filename,
    filesize,
    contentType
) {
    const url = 'https://api.podbean.com/v1/files/uploadAuthorize';

    const params = new URLSearchParams({
        access_token: accessToken,
        filename: filename,
        filesize: filesize,
        content_type: contentType,
    });

    try {
        const response = await fetch(`${url}?${params.toString()}`, {
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error in getUploadAuthorize:', error);
        throw error;
    }
}

async function uploadAndGetFileKey(accessToken, mediaKeyPath, contentType) {
    const filename = path.basename(mediaKeyPath);
    const filesize = fs.statSync(mediaKeyPath).size;

    const { presigned_url: presignedUrl, file_key: fileKey } =
        await getUploadAuthorize(accessToken, filename, filesize, contentType);

    await uploadFileToPresignedUrl(presignedUrl, mediaKeyPath, contentType);

    return fileKey;
}

async function uploadFileToPresignedUrl(presignedUrl, filePath, contentType) {
    const fileStream = fs.createReadStream(filePath);
    const fileSize = fs.statSync(filePath).size;

    try {
        console.log('Uploading file to:', presignedUrl);
        console.log('Content-Type:', contentType);

        const response = await fetch(presignedUrl, {
            method: 'PUT',
            body: fileStream,
            headers: {
                'Content-Type': contentType,
                'Content-Length': fileSize,
            },
            duplex: 'half',
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Error response body:', errorBody);
            throw new Error(
                `HTTP error! status: ${response.status}, body: ${errorBody}`
            );
        }

        console.log('File uploaded successfully:', await response.text());
    } catch (error) {
        console.error('Error in uploadFileToPresignedUrl:', error);
        console.error('File path:', filePath);
        console.error('Presigned URL:', presignedUrl);
        throw error;
    }
}

// Test function (commented out)
// const test = async () => {
//     try {
//         const { presigned_url: presignedUrl, file_key: fileKey } =
//             await getUploadAuthorize();
//         uploadFile(
//             presignedUrl,
//             './audio_output/a_dog_with_a_dangerous_secret_final_output.mp3'
//         );

//         console.log(url);
//     } catch (error) {
//         console.error('Error in test function:', error);
//     }
// };

// test();
