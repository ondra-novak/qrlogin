# qrlogin
Scan QR code to sign in.


working demo: https://qrlogin.novacisko.cz/


## building

### Windows

**Prerequisites**

* MSVC 2008
* OpenSSL (compiled on https://github.com/openssl/openssl/branches/OpenSSL_1_0_2-stable)

Building scripts don't include building steps for OpenSSL. You will need to build it manually 

1. Checkout project + all submodules
2. Unpack and build OpenSSL inside libs\openssl
3. Open project (sln) in Visual Studio 2008. It might work in a newer version (expect MSVC2013, compiler bug)
4. Choose configuration (Debug or Release)
5. Hit Build Solution button
6. Run qrpass project with the following arguments: "default run" or "default start"
7. Browse for http://localhost:14526/


