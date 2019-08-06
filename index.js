const fs = require('fs-extra');
const request = require('request');
const Datastore = require('nedb');
const glob = require('glob');
const spawn = require('child_process').spawn
require('dotenv').config();

let db = new Datastore('database.db');

db.loadDatabase(error => {
   if (error) {
      console.error(`Failed to load database: ${error}`);
   }
});

/*******************Uploading Media/Tweet******************/

const tweet = function(access_token, text, file) {
    const stats = fs.statSync(file.base_path + file.path_media_ext);
    const formData = {
       command: 'INIT',
       media_type: file.mimetype,
       total_bytes: stats.size
    };
    const oAuthData = {
       consumer_key: process.env.CONSUMER_KEY,
       consumer_secret: process.env.CONSUMER_KEY_SECRET,
       token: process.env.ACCESS_TOKEN,
       token_secret: process.env.ACCESS_TOKEN_SECRET
    };
    // First step, we send the video size
    request.post({ url: 'https://upload.twitter.com/1.1/media/upload.json', oauth: oAuthData,
       form: formData, json: true }, function(err, response, body) {
        if (!err) {
            // With the response, we start the video transfer in chunks
            transferProcess(0, body.media_id_string, file, stats.size, access_token, function(err) {
                if (!err) {
                    const formData = {
                        command: 'FINALIZE',
                        media_id: body.media_id_string
                    };          
                    // Once the transfer ended, we finalize it
                    request.post({ url: 'https://upload.twitter.com/1.1/media/upload.json', oauth: oAuthData,
                        form: formData, json: true }, function(err, response, body) {
                        if (!err && !body.error) {
                            const qs = {
                                status: text,
                                media_ids: body.media_id_string
                            };
                            // And the last step, we publish the video as a status update
                            request.post({ url: 'https://api.twitter.com/1.1/statuses/update.json', oauth: oAuthData,
                                qs: qs, json: true }, function(err, response) {
                                if (!err) {
                                    console.log(`THE FOOTAGE WAS TWEETED! =)`);
                                    //Clear storage
                                    glob(`${file.base_path}storage-temp/*`, function (err, files) {
                                        if (err){console.error(err);}
                                        for (file of files) {
                                            let deleteFile = spawn('rm', ['-rf', file]);
                                            deleteFile.stdout.on('data', function(data) {
                                                console.log(`CLEAR STORAGE: ${data}`);
                                            });
                                            deleteFile.stderr.on('data', function(data) {
                                                console.log(`CLEAR STORAGE: ${data}`);
                                            });
                                            console.log('Temp storage cleared');
                                            console.log('Restarting in 3 hours');
                                        }
                                    })
                                }
                            });
                        }
                    });
                }
            });
        }
    });
}


/*************processes each part of the video until its end***************/

const transferProcess = function(index, mediaId, file, fileSize, access_token, callback) {

    // First we generate a copy of the file in order to be independent to the original file
    // because it can have problems when opening it at the same time from other file
    const copyFileName = file.base_path + file.path_media_ext + '-twitter';
    fs.copySync(file.base_path + file.path_media_ext, copyFileName);

    // Once we have the copy, we open it
    const fd = fs.openSync(copyFileName, 'r');

    let bytesRead, data, bufferLength = 33554432;
    let buffer = new Buffer(125000000);

    const startOffset = index * bufferLength;
    const length = startOffset + bufferLength > fileSize ? fileSize - startOffset : bufferLength;

    // We read the amount of bytes specified from startOffset until length
    bytesRead = fs.readSync(fd, buffer, startOffset, length, null);

    // Here, completed tells us that we are transferring the last part or not
    const completed  = bytesRead < bufferLength;
    data = completed ? buffer.slice(0, bytesRead) : buffer;

    // We generate a file with the recently read data, and with a name of copyFileName-chunked-0
    const chunkFileName = copyFileName + '-chunked-' + index;

    // We create the file so then we can read it and send it
    fs.writeFile(chunkFileName, data, function(err) {
        if (err) {
            callback(err);
        } else {
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
            request.post({ url: 'https://upload.twitter.com/1.1/media/upload.json', oauth: oAuthData,
                formData: formData, json: true }, function (err, response) {
                // If there was an error or the reading process of the file has ended, 
                // we go back to the initial process to finalize the video upload
                if (err) {
                callback(err);
                } else if (completed) {
                callback(null);
                } else { // Else, we must continue reading the file, incrementing the reading index
                transferProcess(index + 1, mediaId, file, fileSize, access_token, callback);
                }
            });
        }
    });
};
 
/***********************MAIN***************************/
                               
let run = function() {
    
    let file = {
        base_path: '/home/username/twitter-interval-motion-cam/',
        path_media_ext: 'storage-temp/01.mp4',
        mimetype: 'video/mp4'
    }
    

    let motionProcess = spawn('motion', ['-c', `${file.base_path}motion.conf`]);
    
    setTimeout(function(){
        
        console.log('Killing motion');
        motionProcess.kill();

        const keys = {
            token: process.env.ACCESS_TOKEN,
            token_secret: process.env.ACCESS_TOKEN_SECRET
        }
        const text = 'This is a server test.';
        const buff = fs.readFileSync(`${file.base_path}${file.path_media_ext}`);
        const base64data = buff.toString('base64');
        const dbEntry = {
            timestamp: Date.now(),
            tweet: text,
            media: base64data
        }

        db.insert(dbEntry, (err, response) => { 
            if (err) {
                console.error(err);
            } else {
                file.id = response._id;
                tweet(keys, text, file); // Upload to Twitter
            }
        });
    }, 1000*30*3);

    motionProcess.stdout.on('data', function(data) {
        console.log(`MOTION: ${data}`);
    });
    motionProcess.stderr.on('data', function(data) {
        console.log(`MOTION: ${data}`);
    });
}

run();
setInterval(async () => {run();}, 1000*60*60*3);
