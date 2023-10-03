import { Component, OnInit } from '@angular/core';
import init from './o1';

// DECORATORS VERSION (ORIGINAL)
// class Square extends SmartContract {
// 	@state(Field) num = State<Field>();
//
// 	override init() {
// 		super.init();
// 		this.num.set(Field(3));
// 	}
//
// 	@method update(square: Field) {
// 		const currentState = this.num.get();
// 		this.num.assertEquals(currentState);
// 		square.assertEquals(currentState.mul(currentState));
// 		this.num.set(square);
// 	}
// }
// NON-DECORATORS VERSION (SUGGESTED FOR JAVASCRIPT) - but same behaviour
// class Square extends SmartContract {
// 	num: State<Field> = State();
//
// 	override init() {
// 		super.init();
// 		this.num.set(Field(3));
// 	}
//
// 	update(square: Field) {
// 		const currentState = this.num.get();
// 		this.num.assertEquals(currentState);
// 		square.assertEquals(currentState.mul(currentState));
// 		this.num.set(square);
// 	}
// }
// declareMethods(Square, { update: [Field as any] });
// declareState(Square, { num: Field as any });

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

	ngOnInit() {
		this.loadO1JS();
	}

	async loadO1JS() {

		init();
		// await isReady;
		//
		// console.log('o1js loaded');

		// const useProof = false;
		//
		// const Local = Mina.LocalBlockchain({ proofsEnabled: useProof });
// 		Mina.setActiveInstance(Local);
// 		const { privateKey: deployerKey, publicKey: deployerAccount } = Local.testAccounts[0];
// 		const { privateKey: senderKey, publicKey: senderAccount } = Local.testAccounts[1];
//
// // ----------------------------------------------------
//
// // Create a public/private key pair. The public key is your address and where you deploy the zkApp to
// 		const zkAppPrivateKey = PrivateKey.random();
// 		console.log(zkAppPrivateKey);
// 		const zkAppAddress = zkAppPrivateKey.toPublicKey();
//
// // create an instance of Square - and deploy it to zkAppAddress
// 		const zkAppInstance = new Square(zkAppAddress);
// 		const deployTxn = await Mina.transaction(deployerAccount, () => {
// 			AccountUpdate.fundNewAccount(deployerAccount);
// 			zkAppInstance.deploy();
// 		});
// 		await deployTxn.sign([deployerKey, zkAppPrivateKey]).send();
//
// // get the initial state of Square after deployment
// 		const num0 = zkAppInstance.num.get();
// 		console.log('state after init:', num0.toString());
//
// // ----------------------------------------------------
//
// 		const txn1 = await Mina.transaction(senderAccount, () => {
// 			zkAppInstance.update(Field(9));
// 		});
// 		console.log('prooving');
// 		await txn1.prove();
// 		console.log('prooved');
// 		await txn1.sign([senderKey]).send();
//
// 		const num1 = zkAppInstance.num.get();
// 		console.log('state after txn1:', num1.toString());
//
// // ----------------------------------------------------
//
// 		try {
// 			const txn2 = await Mina.transaction(senderAccount, () => {
// 				zkAppInstance.update(Field(75));
// 			});
// 			await txn2.prove();
// 			await txn2.sign([senderKey]).send();
// 		} catch (ex: any) {
// 			console.log(ex.message);
// 		}
// 		const num2 = zkAppInstance.num.get();
// 		console.log('state after txn2:', num2.toString());
//
// // ----------------------------------------------------
//
// 		const txn3 = await Mina.transaction(senderAccount, () => {
// 			zkAppInstance.update(Field(81));
// 		});
// 		await txn3.prove();
// 		await txn3.sign([senderKey]).send();
//
// 		const num3 = zkAppInstance.num.get();
// 		console.log('state after txn3:', num3.toString());
//
// // ----------------------------------------------------
//
// 		console.log('Shutting down');
//
// 		await shutdown();
	}
}
