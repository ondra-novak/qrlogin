# qrlogin
Scan QR code to sign in.


working demo: https://qrlogin.cz/


## building

### Windows

**Prerequisites**

* MSVC 2008
* OpenSSL (compiled on https://github.com/openssl/openssl/tree/OpenSSL_1_0_2-stable)

Build scripts don't include the building steps for the OpenSSL. You have to build it manually.

1. Checkout project + all submodules
2. Build OpenSSL inside libs\openssl 
3. Open project (sln) in Visual Studio 2008. It might work in a newer version (now compiles in VS2013 Community Version)
4. Choose configuration (Debug or Release)
5. Hit the "Build Solution" button
6. Run qrpass project with the following arguments: "default run" or "default start"
7. Browse for http://localhost:14526/

### Linux

**Tested on Ubuntu: 14.04**

**Prerequisites**

 * clang++ or g++ 4.8
 * libssl-dev
 * autotools, libtool, automake, make, etc...

**Build**

 ```
 $ git clone --recurse-submodules git@github.com:ondra-novak/qrlogin.git
 $ cd qrlogin
 $ make all  
 ```
 
 for g++
 ```
 $ git clone --recurse-submodules git@github.com:ondra-novak/qrlogin.git
 $ cd qrlogin
 $ make all CXX=g++
 ```
 

**Installation**
 ```
 $ sudo sh install.sh
 ```

**Testing**
 ```
 $ xdg-open http://localhost:14526/
 ```

**Starting or stopping service**
 ```
 $ sudo service qrlogin start|stop|restart|status|logrotate
 ```

**Uninstall**
 ```
 s sudo sh uninstall.sh
 ```
 
**Running behind reverse proxy**

It is strongly recommended to run service behind a reverse proxy, for example behind Nginx. You should also update the field "baseURL" of the conf/qrlogin.conf to appropriate real url.


### Linux - Eclipse

 You should be able to import project to Eclipe CDT with GIT module. Just import repository to Eclipse and checkout all projects.

 

