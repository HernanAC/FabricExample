/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../../test-application/javascript/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('../../test-application/javascript/AppUtil.js');

const channelName = 'mychannel';
const chaincodeName = 'basic';
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
const org1UserId = 'appUser';

function prettyJSONString(inputString) {
	return JSON.stringify(JSON.parse(inputString), null, 2);
}

async function main() {
	try {
		// build an in memory object with the network configuration (also known as a connection profile)
		const ccp = buildCCPOrg1();

		// build an instance of the fabric ca services client based on
		// the information in the network configuration
		const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');

		// setup the wallet to hold the credentials of the application user
		const wallet = await buildWallet(Wallets, walletPath);

		// in a real application this would be done on an administrative flow, and only once
		await enrollAdmin(caClient, wallet, mspOrg1);

		// in a real application this would be done only when a new user was required to be added
		// and would be part of an administrative flow
		await registerAndEnrollUser(caClient, wallet, mspOrg1, org1UserId, 'org1.department1');

		// Create a new gateway instance for interacting with the fabric network.
		// In a real application this would be done as the backend server session is setup for
		// a user that has been verified.
		const gateway = new Gateway();

		try {
			// setup the gateway instance
			// The user will now be able to create connections to the fabric network and be able to
			// submit transactions and query. All transactions submitted by this gateway will be
			// signed by this user using the credentials stored in the wallet.
			await gateway.connect(ccp, {
				wallet,
				identity: org1UserId,
				discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});

			// Build a network instance based on the channel where the smart contract is deployed
			const network = await gateway.getNetwork(channelName);

			// Get the contract from the network.
			const contract = network.getContract(chaincodeName);

			// Initialize a set of asset data on the channel using the chaincode 'InitLedger' function.
			// This type of transaction would only be run once by an application the first time it was started after it
			// deployed the first time. Any updates to the chaincode deployed later would likely not need to run
			// an "init" type function.
			console.log('\n--> Ejecutando transacción: InitLedger, crea el conjunto inicial de activos en el ledger');
			await contract.submitTransaction('InitLedger');
			console.log('*** Resultado: finalizado');

			console.log('\n--> Ejecutando transacción: GetAllAssets, devuelve todos los activos del ledger');
			let result = await contract.evaluateTransaction('GetAllAssets');
			console.log(`*** Resultado: ${prettyJSONString(result.toString())}`);

			console.log('\n--> Ejecutando transacción: CreateAsset, crea un nuevo helado con ID, sabor, tamaño, cliente, cono y precio');
			result = await contract.submitTransaction('CreateAsset', 'icecream10', 'vanilla', 'small', 'Carmen', 'sugar', '6000');
			console.log('*** Resultado: finalizado');
			if (`${result}` !== '') {
				console.log(`*** Resultado: ${prettyJSONString(result.toString())}`);
			}

			console.log('\n--> Ejecutando transacción: ReadAsset, utilizando el ID del helado, devuelve su información');
			result = await contract.evaluateTransaction('ReadAsset', 'icecream4');
			console.log(`*** Resultado: ${prettyJSONString(result.toString())}`);

			result = await contract.evaluateTransaction('ReadAsset', 'icecream10');
			console.log(`*** Resultado: ${prettyJSONString(result.toString())}`);

			console.log('\n--> Ejecutando transacción: AssetExists, busca un helado por ID y devuelve verdadero o falso');
			result = await contract.evaluateTransaction('AssetExists', 'icecream1');
			console.log(`*** Resultado: ${prettyJSONString(result.toString())}`);

			console.log('\n--> Ejecutando transacción: UpdateAsset, actualiza el sabor de un helado utilizando el ID, en este caso el 1 a sabor vainilla');
			await contract.submitTransaction('UpdateAsset', 'icecream1', 'vanilla'); 
			console.log('*** Resultado: finalizado');

			console.log('\n--> Ejecutando transacción: ReadAsset, devuelve la información del helado 1');
			result = await contract.evaluateTransaction('ReadAsset', 'icecream1');
			console.log(`*** Resultado: ${prettyJSONString(result.toString())}`);


			console.log('\n--> Ejecutando transacción: TransferAsset, helado 1 cambia de cliente a Maria');
			await contract.submitTransaction('TransferAsset', 'icecream1', 'Maria');
			console.log('*** Resultado: finalizado');

			console.log('\n--> Ejecutando transacción: ReadAsset, devuelve la información del helado 1');
			result = await contract.evaluateTransaction('ReadAsset', 'icecream1');
			console.log(`*** Resultado: ${prettyJSONString(result.toString())}`);
		} finally {
			// Disconnect from the gateway when the application is closing
			// This will close all connections to the network
			gateway.disconnect();
		}
	} catch (error) {
		console.error(`******** FAILED to run the application: ${error}`);
	}
}

main();
