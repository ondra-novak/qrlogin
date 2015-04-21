# qrlogin
Scan QR code to sign in.


working demo: https://qrlogin.novacisko.cz/


## building

### Windows

**Prerequisites**

* MSVC 2008
* OpenSSL (compiled on https://github.com/openssl/openssl/tree/OpenSSL_1_0_2-stable)

Build scripts don't include the building steps for the OpenSSL. You have to build it manually.

1. Checkout project + all submodules
2. Build OpenSSL inside libs\openssl 
3. Open project (sln) in Visual Studio 2008. It might work in a newer version (expect MSVC2013, compiler bug - http://goo.gl/sDVREg)
4. Choose configuration (Debug or Release)
5. Hit the "Build Solution" button
6. Run qrpass project with the following arguments: "default run" or "default start"
7. Browse for http://localhost:14526/

### Linux

**Tested on Ubuntu: 14.04**

**Prerequisites**

 * g++ 4.8
 * libssl-dev
 * autotools, libtool, automake, make, etc...

 ```
 $ git clone --recurse-submodules git@github.com:ondra-novak/qrlogin.git
 $ cd qrlogin
 $ autoreconf -if
 $ ./configure
 $ make -j4
 ```
 
 **qrpass** is the main binary that should appear in the ./bin/ folder

 ```
 $ ./bin/qrpass /tmp/qrpass.pid start
 $ xdg-open http://localhost:14526/
 ```
 to stop service

 ```
 $ ./bin/qrpass /tmp/qrpass.pid stop
 ```
### Linux - Eclipse

 You should be able to import project to Eclipe CDT with GIT module. Just import repository to Eclipse and checkout all projects. You will need to perform autoreconf/configure similar to previous section.

 

