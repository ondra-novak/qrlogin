/*
 * signmsg.cpp
 *
 *  Created on: 28.7.2014
 *      Author: ondra
 */


#include "signmsg.h"
#include "lightspeed/base/containers/stringBase.h"
#include "lightspeed/base/exceptions/errorMessageException.h"
#include "lightspeed/utils/base64.tcc"
#include "lightspeed/base/iter/iteratorFilter.tcc"
#include "coinClasses/uchar_vector.h"
#include "coinClasses/CoinKey.h"
#include "coinClasses/Base58Check.h"
#include "lightspeed/utils/base64.h"



namespace coinstock {

StringCore<byte> msg_numToVarInt(natural i) {
    if (i < 0xfd) {
      return StringCore<byte>((byte)i);
    } else if (i <= 0xffff) {
    	byte block[3];
    	block[0] = 0xfd;
    	block[1] = i & 255;
    	block[2] = i >> 8;
    	return StringCore<byte>(ConstBin(block,3));
    	// can't use numToVarInt from bitcoinjs, BitcoinQT wants big endian here (!)
    } else {
        throw ErrorMessageException(THISLOCATION,"message too large");
    }
}

StringA generateAddressFromSignature(natural addrVersion, ConstStrA prefix, ConstStrA message, ConstStrA signature) {

	StringCore<byte> wholeMessage = msg_numToVarInt(prefix.length()) +
			ConstBin((const byte *)prefix.data(),prefix.length()) +
			msg_numToVarInt(message.length()) +
			ConstBin((const byte *)message.data(),message.length());

	uchar_vector digest = sha256_2(uchar_vector(wholeMessage.data(), wholeMessage.length()));
	uchar_vector binsig;
	binsig.reserve(65);
	Filter<Base64Decoder>::Read<ConstStrA::Iterator> rd(signature.getFwIter());
	while (rd.hasItems()) binsig.push_back(rd.getNext());

	CoinKey sigkey;

	sigkey.setVersionBytes(addrVersion,0);

	if (!sigkey.setCompactSignature(digest,binsig)) return StringA();
	return StringA(sigkey.getAddress().c_str());
}

StringA generateAddressFromSignatureAndHash(natural addrVersion, ConstStrA hash, ConstStrA signature) {
	

	uchar_vector digest;
	digest.reserve(32);
	Filter<HexDecoder<> >::Read<ConstStrA::Iterator> rd2(hash.getFwIter());
	while (rd2.hasItems()) digest.push_back(rd2.getNext());

	uchar_vector binsig;
	binsig.reserve(65);
	Filter<Base64Decoder>::Read<ConstStrA::Iterator> rd(signature.getFwIter());
	while (rd.hasItems()) binsig.push_back(rd.getNext());

	CoinKey sigkey;

	sigkey.setVersionBytes(addrVersion, 0);

	if (!sigkey.setCompactSignature(digest, binsig)) return StringA();
	return StringA(sigkey.getAddress().c_str());
}
bool verifyMessage(ConstStrA prefix, ConstStrA address, ConstStrA message, ConstStrA signature) {
	//TODO: remove this in production!
	if (signature == "debug") return true;
	uchar_vector dummy;
	unsigned int ver;
	if (!fromBase58Check(std::string(address.data(),address.length()),dummy,ver)) return false;
	try {
		StringA addr =  generateAddressFromSignature(ver,prefix,message,signature);

		return addr == address;
	} catch (...) {
		return false;
	}

/*	ConstStrA signPrefix;
	if (currency == "LTC") {
		signPrefix = "Litecoin Signed Message:\n";
	} else if (currency == "BTC") {
		signPrefix = "Bitcoin Signed Message:\n";
	} else
		return false;

	StringCore<byte> wholeMessage = msg_numToVarInt(signPrefix.length()) +
			ConstBin((const byte *)signPrefix.data(),signPrefix.length()) +
			msg_numToVarInt(message.length()) +
			ConstBin((const byte *)message.data(),message.length());

	uchar_vector digest = sha256_2(uchar_vector(wholeMessage.data(), wholeMessage.length()));
	uchar_vector binsig;
	binsig.reserve(65);
	Filter<Base64Decoder>::Read<ConstStrA::Iterator> rd(signature.getFwIter());
	while (rd.hasItems()) binsig.push_back(rd.getNext());

	CoinKey sigkey;

	if (currency == "LTC") {
		sigkey.setVersionBytes(0x30,0);
	} else if (currency == "BTC") {
		sigkey.setVersionBytes(0,0);
	}

	if (!sigkey.setCompactSignature(digest,binsig)) return false;

	std::string addr = sigkey.getAddress();
	return ConstStrA(addr.data(),addr.length()) == address;
*/
}




}

