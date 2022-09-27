# twitter-interval-motion-cam
Records motion detected video at intervals and uploads it to twitter.

## Linux installation:

1. Install Nodejs: https://nodejs.org/

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

5. In the ```twitter-interval-motion-cam``` directory, there is a file called ```.env```. 
Fill in the ```.env``` file with your Twitter authenitication details. Here's an example:
```
twitter-interval-motion-cam/.env
----------------------------------------------------------------------
CONSUMER_KEY=q23yr203rgo23fu023fug3 
CONSUMER_KEY_SECRET=23ruh230r8ug038reghyg4308g34tuhyb
ACCESS_TOKEN=we8yug8uydg2q83ueh2937he293r23r
ACCESS_TOKEN_SECRET=08ugwgfo903ewybf90oweyrg230ygr23ryg230ryg23  
```
Save the ```.env``` file.

## Running
```
sudo node index.js
```
