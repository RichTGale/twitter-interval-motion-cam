const { spawn } = require('node:child_process');
const fs = require('fs-extra');
const request = require('request');
const glob = require('glob');
require('dotenv').config();

/**
 * Tweets text to Twitter.
 */
const tweetText= function(text) 
{
    return new Promise((resolve, reject) => 
        {
            // The form data
            const formData = {
                status: text
            };
            // The authentication data
            const oAuthData = {
                consumer_key: process.env.CONSUMER_KEY,
                consumer_secret: process.env.CONSUMER_KEY_SECRET,
                token: process.env.ACCESS_TOKEN,
                token_secret: process.env.ACCESS_TOKEN_SECRET
            };
            request.post(
                { 
                    url: 'https://api.twitter.com/1.1/statuses/update.json', 
                    oauth: oAuthData,
                    form: formData, 
                    json: true 
                }, 
                (err, response, body) =>
                {
                    if (err) { reject(err); }
                    else { resolve(body); }
                }
            );
        }
    )
};

/**
 * Tweets a video to Twitter.
 */

const tweetVideo = (access_token, text, file) =>
{
    return new Promise((resolve, reject) => 
        {
            const stats = fs.statSync(file.base_path + file.path_media_ext);
            // The form data
            const formData = {
                command: 'INIT',
                media_type: file.mimetype,
                total_bytes: stats.size
            };
            // The authentication data
            const oAuthData = {
                consumer_key: process.env.CONSUMER_KEY,
                consumer_secret: process.env.CONSUMER_KEY_SECRET,
                token: process.env.ACCESS_TOKEN,
                token_secret: process.env.ACCESS_TOKEN_SECRET
            };
            
            // Sending the video size
            request.post(
                { 
                    url: 'https://upload.twitter.com/1.1/media/upload.json', 
                    oauth: oAuthData,
                    form: formData, 
                    json: true 
                }, 
                (err, response, body) => 
                {
                    if (err) 
                    {
                        reject(err);
                    } 
                    else 
                    {
                        // Starting the chunked video transfer
                        await transferProcess(
                            0, 
                            body.media_id_string, 
                            file, stats.size, 
                            access_token
                        ).then(() =>
                            {
                                const formData = {
                                    command: 'FINALIZE',
                                    media_id: body.media_id_string
                                };
                                // Once the transfer ended, we finalize it
                                request.post(
                                    { 
                                        url: 'https://upload.twitter.com/1.1/media/upload.json', 
                                        oauth: oAuthData,
                                        form: formData, 
                                        json: true 
                                    }, 
                                    (err, response, body) => 
                                    {
                                        if (err) 
                                        {
                                            reject(err);
                                        } 
                                        else if (body.error) 
                                        {
                                            reject(body.error);
                                        } 
                                        else 
                                        {
                                            const qs = {
                                                status: text,
                                                media_ids: body.media_id_string
                                            };
                                            // Publishing the video as a status update
                                            request.post(
                                                { 
                                                    url: 'https://api.twitter.com/1.1/statuses/update.json', 
                                                    oauth: oAuthData,
                                                    qs: qs, 
                                                    json: true 
                                                }, 
                                                (err, response, body) => 
                                                {
                                                    if (err) 
                                                    {
                                                        reject(error);
                                                    } 
                                                    else 
                                                    {
                                                        resolve(body);
                                                    }
                                                }
                                            );
                                        }
                                    }
                                );
                            }
                        ).catch(err => 
                            {
                                console.error(err);
                                reject(err);
                            }
                        ) 
                                
                    }
                }
            ); 
        }
    );
};


/**
 * Processes each part of the video until its end.
 */
const transferProcess = 
    function(index, mediaId, file, fileSize, access_token, callback) 
{

    // First we generate a copy of the file in order to be independent to the original file
    // because it can have problems when opening it at the same time from other file
    const copyFileName = file.base_path + file.path_media_ext + '-twitter';
    fs.copySync(file.base_path + file.path_media_ext, copyFileName);

    // Once we have the copy, we open it
    const fd = fs.openSync(copyFileName, 'r');

    let bytesRead, data, bufferLength = 10000000;
    let buffer = new Buffer(100000000);

    const startOffset = index * bufferLength;
    const length = startOffset + bufferLength > fileSize ? 
                        fileSize - startOffset : bufferLength;

    // We read the amount of bytes specified from startOffset until length
    bytesRead = fs.readSync(fd, buffer, startOffset, length, null);

    // Here, completed tells us that we are transferring the last part or not
    const completed  = bytesRead < bufferLength;
    data = completed ? buffer.slice(0, bytesRead) : buffer;

    // We generate a file with the recently read data, and with a name of copyFileName-chunked-0
    const chunkFileName = copyFileName + '-chunked-' + index;

    // We create the file so then we can read it and send it
    fs.writeFile(chunkFileName, data, (err) =>
        {
            if (err) {
                callback(err);
            } 
            else 
            {
                const formData = {
                    command: 'APPEND',
                    media_id: mediaId,
                    segment_index: index
                };
                formData.media = fs.createReadStream(chunkFileName);
                const oAuthData = {
                    consumer_key: process.env.CONSUMER_KEY,
                    consumer_secret: process.env.CONSUMER_KEY_SECRET,
                    token: process.env.ACCESS_TOKEN,
                    token_secret: process.env.ACCESS_TOKEN_SECRET
                };
                // Once we have the file written, we upload it
                request.post(
                    { 
                        url: 'https://upload.twitter.com/1.1/media/upload.json', 
                        oauth: oAuthData,
                        formData: formData, 
                        json: true 
                    }, 
                    (err, response) => 
                    {
                        // If there was an error or the reading process of the file has ended, 
                        // we go back to the initial process to finalize the video upload
                        if (err) 
                        {
                            callback(err);
                        } 
                        else if (completed) 
                        {
                            callback(null);
                        } 
                        else 
                        { 
                            // Else, we must continue reading the file, incrementing the reading index
                            transferProcess(index + 1, mediaId, file, fileSize, access_token, callback);
                        }
                    }
                );
            }
        }
    );
};


/**
 * Runs the Twitter bot.
 */                              
let run = function() 
{
  
    const file = {
        base_path: '/home/username/twitter-interval-motion-cam/',
        path_media_ext: 'storage-temp/01.mp4',
        mimetype: 'video/mp4'
    };

    // Spawning motion process
    const motion = spawn('motion', ['-c', `${file.base_path}motion.conf`]);

    // Uploading saved video after waiting a bit 
    setTimeout(function()
    {
    
        // Killing motion process
        console.log('Killing motion');
        motion.kill();

        // Checking if motion-detected footage was saved
        glob(`${file.base_path}storage-temp/01.mp4`, async (err, files) => 
        {
            // The keys for twitter auth
            const KEYS = {
                token: process.env.ACCESS_TOKEN,
                token_secret: process.env.ACCESS_TOKEN_SECRET
            };
            let text; // The text for the tweet
            
        
            if (err) 
            {
                console.error(err);
            } 
            else if (files.length > 0) 
            {
                text = 'Testing interval motion camera | ' 
                        + new Date().toLocaleString('AU');
                file.id = response._id;
            
                // Uploading video to Twitter
                await tweetVideo(KEYS, text, file) 
                .then(response => 
                    {
                        console.log(response);
                        // Clearing storage
                        glob(`${file.base_path}storage-temp/*`, (err, files) =>
                            {
                                if (err) 
                                {
                                    console.error(err);
                                } 
                                else 
                                {
                                    for (let file of files) 
                                    {
                                        let rm = spawn('rm', [file]);
                                        
                                        rm.stdout.on('data', (data) => {
                                            console.log(`stdout: ${data}`);
                                        });
                                    
                                        rm.stderr.on('data', (data) => {
                                            console.error(`stderr: ${data}`);
                                        });
                                    
                                        rm.on('close', (code) => {
                                            console.log(`rm exited with code ${code}`);
                                        });
                                    }
                                }
                            }
                        );
                    }
                ).catch(err => 
                    {
                        console.error(err);
                    }
                );
            } 
            else 
            {
                text = 'Testing interval motion camera - '
                        + 'NO MOTION DETECTED OR VIDEO FILE NOT FOUND | ' 
                        + new Date().toLocaleString('AU');

                // Tweeting status to Twitter
                await tweetText(text)
                .then(response => 
                    {
                        console.log(response);
                    }
                ).catch(err => console.error(err));
            }
        });
  }, 1000 * 60 * 2);

    motion.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    motion.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    motion.on('close', (code) => {
        console.log(`motion exited with code ${code}`);
    });
}

setInterval(() => {
  run();
}, 1000 * 60 * 30);

