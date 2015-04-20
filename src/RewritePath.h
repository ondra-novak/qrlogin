/*
 * RewritePath.h
 *
 *  Created on: 7. 4. 2015
 *      Author: ondra
 */

#ifndef QRPASS_BREDY_REWRITEPATH_H_
#define QRPASS_BREDY_REWRITEPATH_H_
#include <httpserver/httprequest.h>


namespace qrpass {

using namespace BredyHttpSrv;


class RewritePath: public IHttpHandler {
public:
	RewritePath(StringA targetPath, bool appendVPath = false);

	virtual natural onRequest(IHttpRequest &request, ConstStrA vpath);
	virtual natural onData(IHttpRequest &request) {return 0;}


protected:
	StringA targetPath;
	bool appendVPath;
};


} /* namespace qrpass */

#endif /* QRPASS_BREDY_REWRITEPATH_H_ */
