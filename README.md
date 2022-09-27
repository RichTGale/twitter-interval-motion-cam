# twitter-interval-motion-cam
Records motion detected video at intervals and uploads it to twitter.

## Linux installation:

1. Install NodeJS: https://nodejs.org/

2. Install Motion: https://motion-project.github.io/motion_build.html

3. Open a command prompt and enter the following commands:
```
$ git clone https://github.com/RichTGale/twitter-interval-motion-cam.git

$ cd twitter-interval-motion-cam
```
you may have to make the install file executable:
```
$ chmod +x ./install
```
then:
```
$ ./install
```

5. In the base ```twitter-interval-motion-cam``` directory, there is a hidden file called ```.env```. Fill in the ```.env``` file with your Twitter authenitication details.<br /> 

Here's an example:
```
CONSUMER_KEY=q23yr203rgo23fu023fug3 
CONSUMER_KEY_SECRET=23ruh230r8ug038reghyg4308g34tuhyb
ACCESS_TOKEN=we8yug8uydg2q83ueh2937he293r23r
ACCESS_TOKEN_SECRET=08ugwgfo903ewybf90oweyrg230ygr23ryg230ryg23  
```
Save the ```.env``` file.

## Running
Depending on how you installed NodeJS, you may have to run:
```
$ sudo node index.js
```
or
```
$ sudo nodejs index.js
```

## Notes
 - The default configuration will upload a video that is 1 minute in length, once every 3 hours. However, because it takes time to upload the video to Twitter, this is slightly innacurate. You can change these settings in the ```params.js``` file.

 - This program uses ```motion Version 4.4.0```. If you are using a newer version, you may have to copy its ```motion.conf``` file, usually located at ```/etc/motion/motion.conf```, to ```twitter-interval-motion-cam/motion.conf``` and make appropriate changes to it.
