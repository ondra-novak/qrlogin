/*
 * RewritePath.cpp
 *
 *  Created on: 7. 4. 2015
 *      Author: ondra
 */

#include "RewritePath.h"

namespace qrpass {


RewritePath::RewritePath(StringA targetPath, bool appendVPath)
	:targetPath(targetPath),appendVPath(appendVPath)
{
}

natural RewritePath::onRequest(IHttpRequest& request, ConstStrA vpath) {
	if (appendVPath) {
		StringA target = targetPath+vpath;
		return request.callHandler(target,0);
	} else{
		return request.callHandler(targetPath,0);
	}
}


} /* namespace qrpass */
