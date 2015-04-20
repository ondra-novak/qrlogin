/*
 * signmsg.h
 *
 *  Created on: 28.7.2014
 *      Author: ondra
 */

#ifndef COINSTOCK_BREDY_SIGNMSG_H_
#define COINSTOCK_BREDY_SIGNMSG_H_
#include <lightspeed/base/containers/string.h>
#include "lightspeed/base/containers/constStr.h"


namespace coinstock {

using namespace LightSpeed;

bool verifyMessage(ConstStrA currency, ConstStrA address, ConstStrA message, ConstStrA signature);
StringA generateAddressFromSignature(natural addrVersion, ConstStrA prefix, ConstStrA message, ConstStrA signature);

}



#endif /* COINSTOCK_BREDY_SIGNMSG_H_ */
