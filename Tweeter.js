const request = require('request');
const splitFile = require('split-file');
const fs = require('fs-extra');

function Tweeter(oAuthData) {
    this.oAuthData = oAuthData;

    /**
     * Initialises a a chunk media upload to twitter.
     */
    const initMediaUpload = (mediaFile, fileSize) => {
        return new Promise((resolve, reject) => {
            
            // The form data
            const formData = {
                command: 'INIT',
                total_bytes: fileSize,
                media_type: mediaFile.mimetype,
                media_category: mediaFile.media_category
            };

            // Initialising media upload
            request.post( 
                { 
                    url: 'https://upload.twitter.com/1.1/media/upload.json', 
                    oauth: this.oAuthData,
                    form: formData, 
                    json: true 
                }, 
                (err, response, body) => {
                    // Determining if there's an error and returning it.
                    if (err) { reject(err); }

                    // Returning the response from Twitter.
                    else { resolve(body); }
                }    
            );
        } );
    }

    /**
     * Appends a media chunk to a media upload.
     */
    const chunkMediaUpload = (mediaId, media, index) => {
        return new Promise((resolve, reject) => {

            // The form data.
            const formData = {
                command: 'APPEND',
                media_id: mediaId,
                media: media, 
                segment_index: index
            };

            // Appending the chunk.
            request.post( 
                { 
                    url: 'https://upload.twitter.com/1.1/media/upload.json', 
                    oauth: this.oAuthData,
                    formData: formData, 
                    json: true 
                }, 
                (err, response, body) => {
                    // Determining if there's an error and returning it.
                    if (err) { reject(err); } 

                    // Returning the response from Twitter.
                    else { resolve(); } 
                } 
            );
        } );
    };

    /**
     * Finalises a chunk media upload.
     */
    const finaliseMediaUpload = (mediaId) => {
        return new Promise((resolve, reject) => {

            // The form data.
            const formData = {
                command: 'FINALIZE',
                media_id: mediaId,
            };
            
            // Finalising the chunk media upload.
            request.post(
                { 
                    url: 'https://upload.twitter.com/1.1/media/upload.json', 
                    oauth: this.oAuthData,
                    form: formData, 
                    json: true 
                }, 
                (err, response, body) => {
                    // Determining if there's an error and returning it.
                    if (err) { reject(err); } 
                    else if (body.error) { reject(body.error); } 

                    // Returning the response from Twitter.
                    else { resolve(body); }
                }
            );
        } );
    };

    /** 
     * Monitors the status or state of a chunk media upload.
     */
    const statusMediaUpload = (mediaId, secsToWait) => {
        return new Promise((resolve, reject) => {

            // The form data.
            const formData = {
                command: 'STATUS',
                media_id: mediaId,
            };

            // Getting the status or state of the upload at intervals.
            let intervalId = setInterval(() => {
                request.get(
                    { 
                        url: 'https://upload.twitter.com/1.1/media/upload.json', 
                        oauth: this.oAuthData,
                        form: formData, 
                        json: true 
                    }, 
                    (err, response, body) => {
                        // Determining if there's an error and returning it.
                        if (err) { reject(err); } 
                        else if (body.error) { reject(body.error); } 

                        // Waiting until the upload is in a definite state and
                        // then returning the response from Twitter.
                        else {
                            if (body.processing_info.state != 'pending' 
                            && body.processing_info.state != 'in_progress') {
                                // The upload is in a definite state so we're
                                // clearing the interval.
                                clearInterval(intervalId);

                                // Returning the response from Twitter. 
                                resolve(body);
                            }
                            else {
                                // Printing the upload percentage.
                                console.log("Upload percent: " 
                                    + body.processing_info.progress_percent);
                                secsToWait = body.processing_info.check_after_secs; 
                            }
                        }
                    }
                );
            }, 1000 * secsToWait );
        } );
    };

    /**
     * Updates Twitter status.
     */
    const updateStatus = (text, mediaIds) => {
        return new Promise((resolve, reject) => {

            // The form data.
            let formData = {};
            
            // Determining if there is content to post.
            if (text == "" && mediaIds == "") { 
                reject("updateStatus() has no content to post!");
            }

            // Creating the form data.
            if (text != "") { 
                formData.status = text; 
            }
            if (mediaIds != "") { 
                formData.media_ids = mediaIds; 
            }

            // Updating twitter status.
            request.post( 
                { 
                    url: 'https://api.twitter.com/1.1/statuses/update.json', 
                    oauth: this.oAuthData,
                    form: formData, 
                    json: true 
                }, 
                (err, response, body) => {
                    // Determining if there's an error and returning it.
                    if (err) { reject(err); }

                    // Returning the response freom Twitter.
                    else { resolve(body); }
                } 
            );
        } );
    };

    /**
     * Tweets a text and media status to Twitter.
     */
    this.tweetTextAndMedia = (text, mediaId) => {
        return new Promise(async (resolve, reject) => {
            try {
                // Tweeting text and media and returning the response
                // from Twitter.
                resolve(await updateStatus(text, mediaId));
            }
            // Catching any errors and returing them.
            catch (err) {
                reject(err);
            }
        } );
    };

    /**
     * Tweets a text status to Twitter.
     */
    this.tweetText = (text) => {
        return new Promise(async (resolve, reject) => {
            try {
                // Tweeting text and returning the response
                // from Twitter.
                resolve(await updateStatus(text, ""));
            }
            // Catching any errors and returing them.
            catch (err) {
                reject(err);
            }
        } );
    };

    /**
     * Uploads media to Twitter.
     */
    this.uploadMedia = ( videoFile ) => {
        return new Promise(async (resolve, reject) => {
            const FIVE_MB = 5000000;    // The number of bytes in five megabytes.
            let filenames,  // The names of the split files.
            filestat,   // The stats of a split files.
            fileSize = 0,   // The combined size of the split files in bytes.
            media,  // The raw data of a split file.
            response;   // The response from various Twitter API endpoints.
            
            try {
                // Splitting the video file into a series of smaller files
                filenames = await splitFile.splitFileBySize(
                                                videoFile.path,
                                                FIVE_MB
                                                );

                // Getting the combined size of all the files
                for (let file = 0; file < filenames.length; file++) {
                    filestat = await fs.stat(filenames[file]);
                    fileSize += filestat.size;
                }

                // Initialising the video upload
                response = await initMediaUpload(videoFile, fileSize);
                videoFile.media_id = response.media_id_string;

                // Uploading the video files one at a time
                for (i = 0; i < filenames.length; i++) {
                    media = fs.createReadStream(filenames[i]);
                    await chunkMediaUpload(videoFile.media_id, media, i);
                }

                // Finalising the video upload
                response = await finaliseMediaUpload(videoFile.media_id);

                // Presuming the upload was successful
                videoFile.state = 'succeeded';

                // Waiting for the video to finalise
                if (response.processing_info) {
                    response = await statusMediaUpload(
                                    videoFile.media_id, 
                                    response.processing_info.check_after_secs,
                                    );
                    
                    // Assigning the actual state of the media upload
                    videoFile.state = response.processing_info.state;
                }
                // Returning the media object we made
                resolve(videoFile);
            }
            catch (err) {
                // Rejecting any errors that may have happened
                reject(err);
            }
        } );
    };
};

// Exporting the class as a module.
module.exports = Tweeter;