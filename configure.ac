AC_INIT([qrpass], [1.0.0], [ondra-novak@email.cz])
AC_CONFIG_AUX_DIR([Build])
AC_CONFIG_MACRO_DIR([Build])
AM_INIT_AUTOMAKE([foreign])
AC_PROG_INSTALL
AC_DISABLE_SHARED
AC_PROG_LIBTOOL
AC_PROG_CXX
AC_CHECK_LIB(pthread,pthread_self,[],[
	echo "Requires lbpthread"
	exit -1])
AC_CONFIG_FILES([Makefile])
AC_CONFIG_SUBDIRS([libs/jsonrpcserver libs/lightspeed])

AC_OUTPUT
