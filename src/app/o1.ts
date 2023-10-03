import ZkappWorkerClient from './zkAppWorkerClient';

async function init() {
	const zkappWorkerClient = new ZkappWorkerClient();
	setTimeout(async () => {
		console.log('-------------');
		console.log('loading SnarkyJS');
		console.log('SnarkyJS loaded');
		await zkappWorkerClient.loadSnarkyJS();
		console.log('setting active instance to Berkeley');
		await zkappWorkerClient.setActiveInstanceToBerkeley();
		console.log('-------------');
		console.log('loading contract');
		await zkappWorkerClient.loadContract();
		console.log('contract loaded');
		console.log('-------------');
		const length = await zkappWorkerClient.fetchBlockchainLength();
		console.log('blockchain length: ' + length);

		setTimeout(async () => {
			console.log('-------------');
			console.log('connecting to AURO WALLET');

			await zkappWorkerClient.setActiveInstanceToBerkeley();
			const mina = (window as any).mina;
			const publicKeyBase58: string[] = await mina.requestAccounts();
			console.log('AURO connected');
			console.log(publicKeyBase58);

			setTimeout(async() => {
				console.log('Generating Private Key');
				const generatedPrivKey = await zkappWorkerClient.generatePrivateKey();
				console.log('Generated Private key', generatedPrivKey);
				console.log('-------------');
				console.log('Will compile circuit');
				console.log('compiling');
				const x = await zkappWorkerClient.compileContract();
				console.log('compiled');
			}, 1000);

		}, 1000);
	}, 2000);

}

export default init;
