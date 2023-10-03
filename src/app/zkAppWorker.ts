//@ts-nocheck
import {
	AccountUpdate,
	Bool,
	Circuit,
	CircuitString,
	DeployArgs,
	fetchAccount,
	fetchLastBlock,
	Field,
	isReady,
	method,
	Mina,
	Permissions,
	Poseidon,
	PrivateKey,
	PublicKey,
	SmartContract,
	state,
	State,
	Struct,
	UInt32,
	UInt64
} from 'o1js';
import bs58 from 'bs58';
import { deserializeUint64, deserializeUint8, serializeUint64, serializeUint8 } from 'byteify';

export class Outcome extends Struct({
	description: CircuitString,
	payment_employer: UInt64,
	payment_contractor: UInt64,
	payment_arbiter: UInt64,
	start_after: UInt32,
	finish_before: UInt32,
}) {
	static hash(v: Outcome): Field {
		return Poseidon.hash(
			v.description
				.toFields()
				.concat(
					v.payment_employer.toFields(),
					v.payment_contractor.toFields(),
					v.payment_arbiter.toFields(),
					v.start_after.toFields(),
					v.finish_before.toFields()
				)
		);
	}
}

export class Preimage extends Struct({
	contract: CircuitString,
	address: PublicKey,
	employer: PublicKey,
	contractor: PublicKey,
	arbiter: PublicKey,
	deposited: Outcome,
	success: Outcome,
	failure: Outcome,
	cancel: Outcome,
}) {
	static hash(v: Preimage): Field {
		return Poseidon.hash(
			v.contract
				.toFields()
				.concat(
					v.address.toFields(),
					v.employer.toFields(),
					v.contractor.toFields(),
					v.arbiter.toFields(),
					v.deposited.description.toFields(),
					v.deposited.payment_employer.toFields(),
					v.deposited.payment_contractor.toFields(),
					v.deposited.payment_arbiter.toFields(),
					v.deposited.start_after.toFields(),
					v.deposited.finish_before.toFields(),
					v.success.description.toFields(),
					v.success.payment_employer.toFields(),
					v.success.payment_contractor.toFields(),
					v.success.payment_arbiter.toFields(),
					v.success.start_after.toFields(),
					v.success.finish_before.toFields(),
					v.failure.description.toFields(),
					v.failure.payment_employer.toFields(),
					v.failure.payment_contractor.toFields(),
					v.failure.payment_arbiter.toFields(),
					v.failure.start_after.toFields(),
					v.failure.finish_before.toFields(),
					v.cancel.payment_employer.toFields(),
					v.cancel.payment_contractor.toFields(),
					v.cancel.payment_arbiter.toFields(),
					v.cancel.start_after.toFields(),
					v.cancel.finish_before.toFields()
				)
		);
	}
}

function Uint8ArrayToNumbers(input: Uint8Array): number[] {
	let t: number[] = [];
	for (let i = 0; i < input.length; ++i) {
		t.push(input[i]);
	}
	return t;
}

function bytesToMacPack(_bytes: Uint8Array): string {
	let encoded: string = bs58.encode(_bytes);

	const wordlen: number = 13; // number of characters per word
	const linelen: number = 4; // number of words per line
	// console.log(encoded.match(/.{1,13}/g));

	let macpack: string = 'BEGINMACPACK.';
	let line: number = 1;

	while (encoded.length > 0) {
		let word: string = '';
		if (encoded.length < wordlen) {
			word = encoded;
			encoded = '';
		} else {
			word = encoded.slice(0, wordlen);
			encoded = encoded.slice(13, encoded.length);
		}
		if (line < linelen) {
			macpack += ' ' + word;
			line += 1;
		} else {
			line = 1;
			macpack += '\n' + word;
		}
	}

	macpack += '. ENDMACPACK.';
	return macpack.toString();
}

function MacPackToBytes(macpack: string): Uint8Array {
	let extracted: string = macpack.substring(
		macpack.indexOf('BEGINMACPACK.') + 13,
		macpack.lastIndexOf('. ENDMACPACK.')
	);
	extracted = extracted.replace(/[\n\r\s]/g, '');
	return bs58.decode(extracted);
}

function Uint8ArrayConcat(arrays: Uint8Array[]): Uint8Array {
	let t: number[] = [];
	for (let j = 0; j < arrays.length; ++j) {
		for (let i = 0; i < arrays[j].length; ++i) {
			t.push(arrays[j][i]);
		}
	}
	return new Uint8Array(t);
}

function outcomeToBytes(v: Outcome): Uint8Array {
	const bytes_text: Uint8Array = Buffer.from(v.description.toString());
	const bytes_text_length: Uint8Array = Uint8Array.from(
		serializeUint8(bytes_text.length)
	);
	const bytes_employer: Uint8Array = Uint8Array.from(
		serializeUint64(v.payment_employer.toBigInt())
	);
	const bytes_contractor: Uint8Array = Uint8Array.from(
		serializeUint64(v.payment_contractor.toBigInt())
	);
	const bytes_arbiter: Uint8Array = Uint8Array.from(
		serializeUint64(v.payment_arbiter.toBigInt())
	);
	const bytes_start_after: Uint8Array = Uint8Array.from(
		serializeUint64(v.start_after.toUInt64().toBigInt())
	);
	const bytes_finish_before: Uint8Array = Uint8Array.from(
		serializeUint64(v.finish_before.toUInt64().toBigInt())
	);
	return Uint8ArrayConcat([
		bytes_employer,
		bytes_contractor,
		bytes_arbiter,
		bytes_start_after,
		bytes_finish_before,
		bytes_text_length,
		bytes_text,
	]);
}

function bytesToOutcome(_bytes: Uint8Array): Outcome {
	const payment_employer: UInt64 = UInt64.from(
		deserializeUint64(Uint8ArrayToNumbers(_bytes.slice(0, 8)))
	);
	const payment_contractor: UInt64 = UInt64.from(
		deserializeUint64(Uint8ArrayToNumbers(_bytes.slice(8, 16)))
	);
	const payment_arbiter: UInt64 = UInt64.from(
		deserializeUint64(Uint8ArrayToNumbers(_bytes.slice(16, 24)))
	);
	const start_after: UInt32 = UInt32.from(
		deserializeUint64(Uint8ArrayToNumbers(_bytes.slice(24, 32)))
	);
	const finish_before: UInt32 = UInt32.from(
		deserializeUint64(Uint8ArrayToNumbers(_bytes.slice(32, 40)))
	);

	const text_length: number = deserializeUint8(
		Uint8ArrayToNumbers(_bytes.slice(40, 41))
	);

	const text: string = Buffer.from(
		_bytes.slice(41, 41 + text_length)
	).toString();
	const description: CircuitString = CircuitString.fromString(text);
	return new Outcome({
		description: description,
		payment_employer: payment_employer,
		payment_contractor: payment_contractor,
		payment_arbiter: payment_arbiter,
		start_after: start_after,
		finish_before: finish_before,
	});
}

function preimageToBytes(v: Preimage): Uint8Array {
	const deposited: Outcome = v.deposited;
	const success: Outcome = v.success;
	const failure: Outcome = v.failure;
	const cancel: Outcome = v.cancel;

	// protocol version and format version
	const bytes_header = Uint8Array.from([1, 1]); // contract version, format version

	const bytes_contract_text: Uint8Array = Buffer.from(v.contract.toString());

	const bytes_contract_text_length: Uint8Array = Uint8Array.from(
		serializeUint8(bytes_contract_text.length)
	);

	const bytes_address: Uint8Array = bs58.decode(v.address.toBase58());

	const bytes_employer: Uint8Array = bs58.decode(v.employer.toBase58());
	const bytes_contractor: Uint8Array = bs58.decode(v.contractor.toBase58());
	const bytes_arbiter: Uint8Array = bs58.decode(v.arbiter.toBase58());

	const bytes_deposited: Uint8Array = outcomeToBytes(deposited);
	const bytes_deposited_length: Uint8Array = Uint8Array.from(
		serializeUint8(bytes_deposited.length)
	);

	const bytes_success: Uint8Array = outcomeToBytes(success);
	const bytes_success_length: Uint8Array = Uint8Array.from(
		serializeUint8(bytes_success.length)
	);

	const bytes_failure: Uint8Array = outcomeToBytes(failure);
	const bytes_failure_length: Uint8Array = Uint8Array.from(
		serializeUint8(bytes_failure.length)
	);

	const bytes_cancel: Uint8Array = outcomeToBytes(cancel);
	const bytes_cancel_length: Uint8Array = Uint8Array.from(
		serializeUint8(bytes_cancel.length)
	);

	return Uint8ArrayConcat([
		bytes_header,
		bytes_address,
		bytes_employer,
		bytes_contractor,
		bytes_arbiter,
		bytes_deposited_length,
		bytes_deposited,
		bytes_success_length,
		bytes_success,
		bytes_failure_length,
		bytes_failure,
		bytes_cancel_length,
		bytes_cancel,
		bytes_contract_text_length,
		bytes_contract_text,
	]);
}

function bytesToPreimage(_bytes: Uint8Array): Preimage {
	// for now ignore the protocol version and format version and contract address...
	const address: PublicKey = PublicKey.fromBase58(
		bs58.encode(_bytes.slice(2, 42))
	);

	let i = 2 + 40;

	const employer: PublicKey = PublicKey.fromBase58(
		bs58.encode(_bytes.slice(i, i + 40))
	);
	i += 40;
	const contractor: PublicKey = PublicKey.fromBase58(
		bs58.encode(_bytes.slice(i, i + 40))
	);
	i += 40;
	const arbiter: PublicKey = PublicKey.fromBase58(
		bs58.encode(_bytes.slice(i, i + 40))
	);
	i += 40;

	let length: number = 0;

	length = deserializeUint8(
		Uint8ArrayToNumbers(_bytes.slice(i, i + 1))
	);
	i += 1;
	const outcome_deposited: Outcome = bytesToOutcome(
		_bytes.slice(i, i + length)
	);
	i += length;

	length = deserializeUint8(
		Uint8ArrayToNumbers(_bytes.slice(i, i + 1))
	);
	i += 1;
	const outcome_success: Outcome = bytesToOutcome(_bytes.slice(i, i + length));
	i += length;

	length = deserializeUint8(
		Uint8ArrayToNumbers(_bytes.slice(i, i + 1))
	);
	i += 1;
	const outcome_failure: Outcome = bytesToOutcome(_bytes.slice(i, i + length));
	i += length;

	length = deserializeUint8(
		Uint8ArrayToNumbers(_bytes.slice(i, i + 1))
	);
	i += 1;
	const outcome_cancel: Outcome = bytesToOutcome(_bytes.slice(i, i + length));
	i += length;

	length = deserializeUint8(
		Uint8ArrayToNumbers(_bytes.slice(i, i + 1))
	);
	i += 1;
	const contract: string = Buffer.from(_bytes.slice(i, i + length)).toString();

	return new Preimage({
		contract: CircuitString.fromString(contract),
		address: address,
		employer: employer,
		contractor: contractor,
		arbiter: arbiter,
		deposited: outcome_deposited,
		success: outcome_success,
		failure: outcome_failure,
		cancel: outcome_cancel,
	});
}

export function fromMacPack(macpack: string): Preimage {
	const _bytes: Uint8Array = MacPackToBytes(macpack);
	return bytesToPreimage(_bytes);
}

export function toMacPack(mac_contract: Preimage): string {
	const _bytes: Uint8Array = preimageToBytes(mac_contract);
	return bytesToMacPack(_bytes);
}


const state_initial: number = 0;
const state_deposited: number = 1;
const state_canceled_early: number = 2;
const state_canceled: number = 3;
const state_succeeded: number = 4;
const state_failed: number = 5;

class Mac extends SmartContract {
	@state(Field) commitment = State<Field>();
	@state(Field) automaton_state = State<Field>();
	@state(Field) memory = State<Field>();

	override deploy(args: DeployArgs) {
		super.deploy(args);
		this.setPermissions({
			...Permissions.default(),
			editState: Permissions.proof(),
			send: Permissions.proof(),
		});
	}

	@method initialize(commitment: Field) {
		this.commitment.set(commitment);
		this.automaton_state.set(Field(0));
		this.memory.set(Field(0));
	}

	@method deposit(contract_preimage: Preimage, actor: PublicKey) {
		const commitment: Field = this.commitment.get();
		this.commitment.assertEquals(commitment);

		const automaton_state: Field = this.automaton_state.get();
		this.automaton_state.assertEquals(automaton_state);

		const memory: Field = this.memory.get();
		this.memory.assertEquals(memory);

		const blockchain_length: UInt32 = this.network.blockchainLength.get();
		this.network.blockchainLength.assertEquals(blockchain_length);

		// make sure this is the right contract by checking if
		// the caller is in possession of the correct preimage
		commitment.assertEquals(Preimage.hash(contract_preimage));

		// check if the deposit deadline is respected
		blockchain_length.assertGte(contract_preimage.deposited.start_after);
		blockchain_length.assertLt(contract_preimage.deposited.finish_before);

		// make sure the caller is a party in the contract
		actor
			.equals(contract_preimage.arbiter)
			.or(actor.equals(contract_preimage.contractor))
			.or(actor.equals(contract_preimage.employer))
			.assertTrue();

		// only someone who has not yet deposited can deposit
		const actions: Bool[] = memory.toBits(3);
		const acted: Bool = Circuit.if(
			actor.equals(contract_preimage.employer),
			actions[2],
			Circuit.if(
				actor.equals(contract_preimage.contractor),
				actions[1],
				actions[0]
			)
		);
		const has_not_acted: Bool = acted.not();
		has_not_acted.assertTrue();

		// do the deposit
		const amount: UInt64 = Circuit.if(
			actor.equals(contract_preimage.employer),
			contract_preimage.deposited.payment_employer,
			Circuit.if(
				actor.equals(contract_preimage.contractor),
				contract_preimage.deposited.payment_contractor,
				Circuit.if(
					actor.equals(contract_preimage.arbiter),
					contract_preimage.deposited.payment_arbiter,
					UInt64.from(0)
				)
			)
		);

		// transfer the funds
		const payerUpdate = AccountUpdate.create(actor);
		payerUpdate.send({ to: this.address, amount: amount });

		// update the memory
		actions[2] = Circuit.if(
			actor.equals(contract_preimage.employer),
			Bool(true),
			actions[2]
		);
		actions[1] = Circuit.if(
			actor.equals(contract_preimage.contractor),
			Bool(true),
			actions[1]
		);
		actions[0] = Circuit.if(
			actor.equals(contract_preimage.arbiter),
			Bool(true),
			actions[0]
		);

		// check if everyone acted
		const has_everyone_acted: Bool = actions[0].and(actions[1]).and(actions[2]);

		// update the memory
		const new_memory: Field = Circuit.if(
			has_everyone_acted,
			Field(0),
			Field.fromBits(actions)
		);
		this.memory.set(new_memory);

		// update state
		const new_state: Field = Circuit.if(
			has_everyone_acted,
			Field(state_deposited),
			Field(state_initial)
		);
		this.automaton_state.set(new_state);
	}

	@method withdraw(contract_preimage: Preimage, actor: PublicKey) {
		const commitment: Field = this.commitment.get();
		this.commitment.assertEquals(commitment);

		const automaton_state: Field = this.automaton_state.get();
		this.automaton_state.assertEquals(automaton_state);

		const memory: Field = this.memory.get();
		this.memory.assertEquals(memory);

		// make sure this is the right contract by checking if
		// the caller is in possession of the correct preimage
		commitment.assertEquals(Preimage.hash(contract_preimage));

		// make sure the caller is a party in the contract
		actor
			.equals(contract_preimage.arbiter)
			.or(actor.equals(contract_preimage.contractor))
			.or(actor.equals(contract_preimage.employer))
			.assertTrue();

		// check who has acted
		const actions: Bool[] = memory.toBits(3);
		const acted: Bool = Circuit.if(
			actor.equals(contract_preimage.employer),
			actions[2],
			Circuit.if(
				actor.equals(contract_preimage.contractor),
				actions[1],
				Circuit.if(
					actor.equals(contract_preimage.arbiter),
					actions[0],
					Bool(false)
				)
			)
		);
		const has_not_acted: Bool = acted.not();

		// determine if it is allowed to withdraw at this stage
		const is_state_canceled_early: Bool = automaton_state.equals(
			Field(state_canceled_early)
		);
		const is_state_canceled: Bool = automaton_state.equals(
			Field(state_canceled)
		);
		const is_state_succeeded: Bool = automaton_state.equals(
			Field(state_succeeded)
		);
		const is_state_failed: Bool = automaton_state.equals(Field(state_failed));

		const withdraw_allowed: Bool = is_state_canceled_early
			.and(acted)
			.or(is_state_canceled.and(has_not_acted))
			.or(is_state_succeeded.and(has_not_acted))
			.or(is_state_failed.and(has_not_acted));
		withdraw_allowed.assertTrue();

		// determine the amount of the withdrawal
		const current_outcome: Outcome = Circuit.if(
			is_state_canceled_early,
			contract_preimage.deposited as any,
			Circuit.if(
				is_state_canceled,
				contract_preimage.cancel as any,
				Circuit.if(
					is_state_succeeded,
					contract_preimage.success as any,
					contract_preimage.failure // only option left...
				)
			)
		);
		const amount: UInt64 = Circuit.if(
			actor.equals(contract_preimage.employer),
			current_outcome.payment_employer,
			Circuit.if(
				actor.equals(contract_preimage.contractor),
				current_outcome.payment_contractor,
				current_outcome.payment_arbiter // only option left...
			)
		);

		// do the withdrawal
		this.send({ to: actor, amount: amount });

		// update the memory
		actions[2] = Circuit.if(
			actor.equals(contract_preimage.employer),
			actions[2].not(),
			actions[2]
		);
		actions[1] = Circuit.if(
			actor.equals(contract_preimage.contractor),
			actions[1].not(),
			actions[1]
		);
		actions[0] = Circuit.if(
			actor.equals(contract_preimage.arbiter),
			actions[0].not(),
			actions[0]
		);

		const new_memory: Field = Field.fromBits(actions);
		this.memory.set(new_memory);
	}

	@method success(contract_preimage: Preimage, actor_pk: PublicKey) {
		const commitment: Field = this.commitment.get();
		this.commitment.assertEquals(commitment);

		const automaton_state: Field = this.automaton_state.get();
		this.automaton_state.assertEquals(automaton_state);

		const blockchain_length: UInt32 = this.network.blockchainLength.get();
		this.network.blockchainLength.assertEquals(blockchain_length);

		// make sure this is the right contract by checking if
		// the caller is in possession of the correct preimage
		commitment.assertEquals(Preimage.hash(contract_preimage));

		// check if the deposit deadline is respected
		blockchain_length.assertGte(contract_preimage.success.start_after);
		blockchain_length.assertLt(contract_preimage.success.finish_before);

		// make sure the caller is a party in the contract
		actor_pk
			.equals(contract_preimage.arbiter)
			.or(actor_pk.equals(contract_preimage.contractor))
			.or(actor_pk.equals(contract_preimage.employer))
			.assertTrue();

		// make sure that the caller is approving this method
		AccountUpdate.create(actor_pk).requireSignature();

		// state must be deposited
		automaton_state.assertEquals(Field(state_deposited));

		// ensure caller is the arbiter
		actor_pk.equals(contract_preimage.arbiter).assertTrue();

		// update the state to "succeeded"
		this.automaton_state.set(Field(state_succeeded));

		// zero the memory for the withdrawals
		this.memory.set(Field(0));
	}

	@method failure(contract_preimage: Preimage, actor_pk: PublicKey) {
		const commitment: Field = this.commitment.get();
		this.commitment.assertEquals(commitment);

		const automaton_state: Field = this.automaton_state.get();
		this.automaton_state.assertEquals(automaton_state);

		const blockchain_length: UInt32 = this.network.blockchainLength.get();
		this.network.blockchainLength.assertEquals(blockchain_length);

		// make sure this is the right contract by checking if
		// the caller is in possession of the correct preimage
		commitment.assertEquals(Preimage.hash(contract_preimage));

		// check if the deposit deadline is respected
		blockchain_length.assertGte(contract_preimage.failure.start_after);
		blockchain_length.assertLt(contract_preimage.failure.finish_before);

		// make sure the caller is a party in the contract
		actor_pk
			.equals(contract_preimage.arbiter)
			.or(actor_pk.equals(contract_preimage.contractor))
			.or(actor_pk.equals(contract_preimage.employer))
			.assertTrue();

		// make sure that the caller is approving this method
		AccountUpdate.create(actor_pk).requireSignature();

		// state must be deposited
		automaton_state.assertEquals(Field(state_deposited));

		// ensure caller is the arbiter
		actor_pk.equals(contract_preimage.arbiter).assertTrue();

		// update the state to "canceled"
		this.automaton_state.set(Field(state_failed));

		// zero the memory for the withdrawals
		this.memory.set(Field(0));
	}

	@method cancel(contract_preimage: Preimage, actor_pk: PublicKey) {
		const commitment: Field = this.commitment.get();
		this.commitment.assertEquals(commitment);

		const automaton_state: Field = this.automaton_state.get();
		this.automaton_state.assertEquals(automaton_state);

		const memory: Field = this.memory.get();
		this.memory.assertEquals(memory);

		const blockchain_length: UInt32 = this.network.blockchainLength.get();
		this.network.blockchainLength.assertEquals(blockchain_length);

		// make sure this is the right contract by checking if
		// the caller is in possession of the correct preimage
		commitment.assertEquals(Preimage.hash(contract_preimage));

		// make sure the caller is a party in the contract
		actor_pk
			.equals(contract_preimage.arbiter)
			.or(actor_pk.equals(contract_preimage.contractor))
			.or(actor_pk.equals(contract_preimage.employer))
			.assertTrue();

		// make sure that the caller is approving this method
		AccountUpdate.create(actor_pk).requireSignature();

		// before deposit deadline anyone can cancel
		const is_in_deposit: Bool = contract_preimage.deposited.start_after
			.lte(blockchain_length)
			.and(contract_preimage.deposited.finish_before.gt(blockchain_length))
			.and(automaton_state.equals(Field(state_initial)));

		// after deposit deadline only the employee can cancel
		const is_within_deadline: Bool = contract_preimage.success.start_after
			.lte(blockchain_length)
			.and(contract_preimage.success.finish_before.gt(blockchain_length))
			.and(automaton_state.equals(Field(state_deposited)));

		// as for the deadline, it has to be either initial (for everyone)
		// either deposited (for employee) in order to cancel
		is_in_deposit.or(is_within_deadline).assertTrue();

		// if it is after the initial stage, caller must be employee
		const is_caller_correct: Bool = Circuit.if(
			is_within_deadline,
			actor_pk.equals(contract_preimage.employer),
			Bool(true)
		);

		is_caller_correct.assertTrue();

		// update the state to "canceled" or "canceled early"
		const next_state: Field = Circuit.if(
			is_within_deadline,
			Field(state_canceled),
			Field(state_canceled_early)
		);
		this.automaton_state.set(next_state);

		// if canceled late then zero out the memory
		const next_memory: Field = Circuit.if(is_within_deadline, Field(0), memory);
		this.memory.set(next_memory);
	}
}

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

interface VerificationKeyData {
	data: string;
	hash: Field | string;
}

const applicationState = {
	Mac: null as null | typeof Mac,
	Outcome: null as null | typeof Outcome,
	Preimage: null as null | typeof Preimage,
	zkapp: null as null | Mac,
	preimage: null as null | Preimage,
	transaction: null as null | Transaction,
	fromMacPack: typeof fromMacPack,
	toMacPack: typeof toMacPack,
	vKey: null as null | VerificationKeyData
};

// ---------------------------------------------------------------------------------------

const functions = {
	loadSnarkyJS: async (args: {}) => {
		await isReady;
	},
	setActiveInstanceToBerkeley: async (args: {}) => {
		const Berkeley = Mina.BerkeleyQANet(
			'https://proxy.berkeley.minaexplorer.com/graphql'
		);
		Mina.setActiveInstance(Berkeley);
	},
	loadContract: async (args: {}) => {
		applicationState.Mac = Mac;
		applicationState.Outcome = Outcome;
		applicationState.Preimage = Preimage;
		applicationState.fromMacPack = typeof fromMacPack;
		applicationState.toMacPack = typeof toMacPack;
	},
	fetchBlockchainLength: async (args: {}) => {
		let block = await fetchLastBlock(
			'https://proxy.berkeley.minaexplorer.com/graphql');
		return block.blockchainLength.toJSON();
	},
	compileContract: async (args: {}) => {
		let { verificationKey } = await applicationState.Mac!.compile();
		applicationState.vKey = verificationKey;
	},
	fetchAccount: async (args: { publicKey58: string }) => {
		const publicKey = PublicKey.fromBase58(args.publicKey58);
		return await fetchAccount({ publicKey });
	},
	generatePrivateKey: async (args: {}) => {
		const privateKey: PrivateKey = PrivateKey.random();
		return privateKey.toBase58();
	},
	initZkappInstance: async (args: { publicKey58: string }) => {
		const publicKey = PublicKey.fromBase58(args.publicKey58);
		applicationState.zkapp = new applicationState.Mac!(publicKey);
	},
	getBlockchainLength: async (args: {}) => {
		const network_state = await Mina.getNetworkState();
		return network_state.blockchainLength.toString();
	},
	createDeployTransaction: async (args: { privateKey58: string, deployerPrivateKey58: string }) => {
		const zkAppPrivateKey: PrivateKey = PrivateKey.fromBase58(args.privateKey58);
		const deployerPrivateKey: PrivateKey = PrivateKey.fromBase58(args.deployerPrivateKey58);
		let transactionFee = 100_000_000;
		//const _commitment: Field = state.Preimage.hash(state.preimage);
		let verificationKey: VerificationKeyData = applicationState.vKey;
		const transaction = await Mina.transaction(
			{ feePayerKey: deployerPrivateKey, fee: transactionFee },
			() => {
				AccountUpdate.fundNewAccount(deployerPrivateKey);
				applicationState.zkapp!.deploy({ zkappKey: zkAppPrivateKey, verificationKey });
				//state.zkapp!.initialize(_commitment);
			});
		applicationState.transaction = transaction;
	},
	createInitTransaction: async (args: { deployerPrivateKey58: string }) => {
		const deployerPrivateKey: PrivateKey = PrivateKey.fromBase58(args.deployerPrivateKey58);
		let transactionFee = 100_000_000;
		const _commitment: Field = applicationState.Preimage.hash(applicationState.preimage);
		const transaction = await Mina.transaction(
			{ feePayerKey: deployerPrivateKey, fee: transactionFee },
			() => {
				applicationState.zkapp!.initialize(_commitment);
			});
		applicationState.transaction = transaction;
	},
	createDeployTransactionAuro: async (args: { privateKey58: string }) => {
		const zkAppPrivateKey: PrivateKey = PrivateKey.fromBase58(args.privateKey58);
		const _commitment: Field = applicationState.Preimage.hash(applicationState.preimage);
		let verificationKey: VerificationKeyData = applicationState.vKey;
		const transaction = await Mina.transaction(
			{ feePayerKey: zkAppPrivateKey, fee: 100_000_000 },
			() => {
				applicationState.zkapp!.deploy({ zkappKey: zkAppPrivateKey, verificationKey });
				applicationState.zkapp!.initialize(_commitment);
			});
		applicationState.transaction = transaction;
	},
	sendTransaction: async (args: {}) => {
		const res = await applicationState.transaction.send();
		const hash = await res.hash();
		return JSON.stringify({
			'hash': hash
		});
	},
	sendTransactionSign: async (args: { deployerPrivateKey58: string }) => {
		const feePayerPrivateKey: PrivateKey = PrivateKey.fromBase58(args.deployerPrivateKey58);
		applicationState.transaction.sign([feePayerPrivateKey]);
		const res = await applicationState.transaction.send();
		const hash = await res.hash();
		return JSON.stringify({
			'hash': hash
		});
	},
	createDepositTransaction: async (args: { actorPublicKey58: string, deployerPrivateKey58: string }) => {
		const feePayerPrivateKey: PrivateKey = PrivateKey.fromBase58(args.deployerPrivateKey58);
		let transactionFee = 100_000_000;
		const actor: PublicKey = PublicKey.fromBase58(args.actorPublicKey58);
		const transaction = await Mina.transaction(
			{ feePayerKey: feePayerPrivateKey, fee: transactionFee },
			() => {
				applicationState.zkapp!.deposit(applicationState.preimage, actor);
			});
		applicationState.transaction = transaction;
	},
	createDepositTransactionAuro: async (args: { actorPublicKey58: string }) => {
		const actor: PublicKey = PublicKey.fromBase58(args.actorPublicKey58);
		const transaction = await Mina.transaction(() => {
			applicationState.zkapp!.deposit(applicationState.preimage, actor);
		});
		applicationState.transaction = transaction;
	},
	createWithdrawTransaction: async (args: { actorPublicKey58: string, deployerPrivateKey58: string }) => {
		const feePayerPrivateKey: PrivateKey = PrivateKey.fromBase58(args.deployerPrivateKey58);
		let transactionFee = 100_000_000;
		const actor: PublicKey = PublicKey.fromBase58(args.actorPublicKey58);
		const transaction = await Mina.transaction(
			{ feePayerKey: feePayerPrivateKey, fee: transactionFee },
			() => {
				applicationState.zkapp!.withdraw(applicationState.preimage, actor);
			});
		applicationState.transaction = transaction;
	},
	createWithdrawTransactionAuro: async (args: { publicKey58: string }) => {
		const actor: PublicKey = PublicKey.fromBase58(args.publicKey58);
		const transaction = await Mina.transaction(() => {
			applicationState.zkapp!.withdraw(applicationState.preimage, actor);
		});
		applicationState.transaction = transaction;
	},
	createSuccessTransaction: async (args: { actorPublicKey58: string, deployerPrivateKey58: string }) => {
		const feePayerPrivateKey: PrivateKey = PrivateKey.fromBase58(args.deployerPrivateKey58);
		let transactionFee = 100_000_000;
		const actor: PublicKey = PublicKey.fromBase58(args.actorPublicKey58);
		const transaction = await Mina.transaction(
			{ feePayerKey: feePayerPrivateKey, fee: transactionFee },
			() => {
				applicationState.zkapp!.success(applicationState.preimage, actor);
			});
		applicationState.transaction = transaction;
	},
	createSuccessTransactionAuro: async (args: { publicKey58: string }) => {
		const actor: PublicKey = PublicKey.fromBase58(args.publicKey58);
		const transaction = await Mina.transaction(() => {
			applicationState.zkapp!.success(applicationState.preimage, actor);
		});
		applicationState.transaction = transaction;
	},
	createFailureTransaction: async (args: { actorPublicKey58: string, deployerPrivateKey58: string }) => {
		const feePayerPrivateKey: PrivateKey = PrivateKey.fromBase58(args.deployerPrivateKey58);
		let transactionFee = 100_000_000;
		const actor: PublicKey = PublicKey.fromBase58(args.actorPublicKey58);
		const transaction = await Mina.transaction(
			{ feePayerKey: feePayerPrivateKey, fee: transactionFee },
			() => {
				applicationState.zkapp!.failure(applicationState.preimage, actor);
			});
		applicationState.transaction = transaction;
	},
	createFailureTransactionAuro: async (args: { publicKey58: string }) => {
		const actor: PublicKey = PublicKey.fromBase58(args.publicKey58);
		const transaction = await Mina.transaction(() => {
			applicationState.zkapp!.failure(applicationState.preimage, actor);
		});
		applicationState.transaction = transaction;
	},
	createCancelTransaction: async (args: { actorPublicKey58: string, deployerPrivateKey58: string }) => {
		const feePayerPrivateKey: PrivateKey = PrivateKey.fromBase58(args.deployerPrivateKey58);
		let transactionFee = 100_000_000;
		const actor: PublicKey = PublicKey.fromBase58(args.actorPublicKey58);
		const transaction = await Mina.transaction(
			{ feePayerKey: feePayerPrivateKey, fee: transactionFee },
			() => {
				applicationState.zkapp!.cancel(applicationState.preimage, actor);
			});
		applicationState.transaction = transaction;
	},
	createCancelTransactionAuro: async (args: { publicKey58: string }) => {
		const actor: PublicKey = PublicKey.fromBase58(args.publicKey58);
		const transaction = await Mina.transaction(() => {
			applicationState.zkapp!.cancel(applicationState.preimage, actor);
		});
		applicationState.transaction = transaction;
	},
	getContractState: async (args: {}) => {
		const automaton_state: Field = await applicationState.zkapp!.automaton_state.get();
		const memory: Field = await applicationState.zkapp!.memory.get();
		const actions: Bool[] = memory.toBits(3);
		let st = 'initial';
		switch (parseInt(automaton_state.toString())) {
			case 0:
				st = 'initial';
				break;
			case 1:
				st = 'deposited';
				break;
			case 2:
				st = 'canceled_early';
				break;
			case 3:
				st = 'canceled';
				break;
			case 4:
				st = 'succeeded';
				break;
			case 5:
				st = 'failed';
				break;
			default:
				st = 'unknown';
				break;
		}
		return JSON.stringify({
			'acted': {
				'employer': actions[2].toBoolean(),
				'contractor': actions[1].toBoolean(),
				'arbiter': actions[0].toBoolean()
			},
			'automaton_state': st
		});
	},
	fromMacPack: (args: { macpack: string }) => {
		applicationState.preimage = (applicationState as any).fromMacPack(args.macpack);
	},
	toMacPack: (args: {}) => {
		return (applicationState as any).toMacPack(applicationState.preimage);
	},
	getPreimageData: (args: {}) => {
		return JSON.stringify({
			address: applicationState.preimage.address.toBase58(),
			employer: applicationState.preimage.employer.toBase58(),
			contractor: applicationState.preimage.contractor.toBase58(),
			arbiter: applicationState.preimage.arbiter.toBase58(),
			contract_description: applicationState.preimage.contract.toString(),
			contract_outcome_deposit_description: applicationState.preimage.deposited.description.toString(),
			contract_outcome_deposit_after: parseInt(applicationState.preimage.deposited.start_after.toString()),
			contract_outcome_deposit_before: parseInt(applicationState.preimage.deposited.finish_before.toString()),
			contract_outcome_deposit_employer: parseInt(applicationState.preimage.deposited.payment_employer.toString()),
			contract_outcome_deposit_contractor: parseInt(applicationState.preimage.deposited.payment_contractor.toString()),
			contract_outcome_deposit_arbiter: parseInt(applicationState.preimage.deposited.payment_arbiter.toString()),
			contract_outcome_success_description: applicationState.preimage.success.description.toString(),
			contract_outcome_success_after: parseInt(applicationState.preimage.success.start_after.toString()),
			contract_outcome_success_before: parseInt(applicationState.preimage.success.finish_before.toString()),
			contract_outcome_success_employer: parseInt(applicationState.preimage.success.payment_employer.toString()),
			contract_outcome_success_contractor: parseInt(applicationState.preimage.success.payment_contractor.toString()),
			contract_outcome_success_arbiter: parseInt(applicationState.preimage.success.payment_arbiter.toString()),
			contract_outcome_failure_description: applicationState.preimage.failure.description.toString(),
			contract_outcome_failure_after: parseInt(applicationState.preimage.failure.start_after.toString()),
			contract_outcome_failure_before: parseInt(applicationState.preimage.failure.finish_before.toString()),
			contract_outcome_failure_employer: parseInt(applicationState.preimage.failure.payment_employer.toString()),
			contract_outcome_failure_contractor: parseInt(applicationState.preimage.failure.payment_contractor.toString()),
			contract_outcome_failure_arbiter: parseInt(applicationState.preimage.failure.payment_arbiter.toString()),
			contract_outcome_cancel_description: applicationState.preimage.cancel.description.toString(),
			contract_outcome_cancel_after: parseInt(applicationState.preimage.cancel.start_after.toString()),
			contract_outcome_cancel_before: parseInt(applicationState.preimage.cancel.finish_before.toString()),
			contract_outcome_cancel_employer: parseInt(applicationState.preimage.cancel.payment_employer.toString()),
			contract_outcome_cancel_contractor: parseInt(applicationState.preimage.cancel.payment_contractor.toString()),
			contract_outcome_cancel_arbiter: parseInt(applicationState.preimage.cancel.payment_arbiter.toString())
		});
	},
	definePreimage: (args: {
		address: string,
		employer: string,
		contractor: string,
		arbiter: string,
		contract_description: string,
		contract_outcome_deposit_description: string,
		contract_outcome_deposit_after: number,
		contract_outcome_deposit_before: number,
		contract_outcome_deposit_employer: number,
		contract_outcome_deposit_contractor: number,
		contract_outcome_deposit_arbiter: number,
		contract_outcome_success_description: string,
		contract_outcome_success_after: number,
		contract_outcome_success_before: number,
		contract_outcome_success_employer: number,
		contract_outcome_success_contractor: number,
		contract_outcome_success_arbiter: number,
		contract_outcome_failure_description: string,
		contract_outcome_failure_after: number,
		contract_outcome_failure_before: number,
		contract_outcome_failure_employer: number,
		contract_outcome_failure_contractor: number,
		contract_outcome_failure_arbiter: number,
		contract_outcome_cancel_description: string,
		contract_outcome_cancel_after: number,
		contract_outcome_cancel_before: number,
		contract_outcome_cancel_employer: number,
		contract_outcome_cancel_contractor: number,
		contract_outcome_cancel_arbiter: number
	}) => {
		const outcome_deposited: Outcome = new applicationState.Outcome({
			description: CircuitString.fromString(args.contract_outcome_deposit_description),
			payment_employer: UInt64.from(args.contract_outcome_deposit_employer),
			payment_contractor: UInt64.from(args.contract_outcome_deposit_contractor),
			payment_arbiter: UInt64.from(args.contract_outcome_deposit_arbiter),
			start_after: UInt32.from(args.contract_outcome_deposit_after),
			finish_before: UInt32.from(args.contract_outcome_deposit_before)
		});

		const outcome_success: Outcome = new applicationState.Outcome({
			description: CircuitString.fromString(args.contract_outcome_success_description),
			payment_employer: UInt64.from(args.contract_outcome_success_employer),
			payment_contractor: UInt64.from(args.contract_outcome_success_contractor),
			payment_arbiter: UInt64.from(args.contract_outcome_success_arbiter),
			start_after: UInt32.from(args.contract_outcome_success_after),
			finish_before: UInt32.from(args.contract_outcome_success_before)
		});

		const outcome_failure: Outcome = new applicationState.Outcome({
			description: CircuitString.fromString(args.contract_outcome_failure_description),
			payment_employer: UInt64.from(args.contract_outcome_failure_employer),
			payment_contractor: UInt64.from(args.contract_outcome_failure_contractor),
			payment_arbiter: UInt64.from(args.contract_outcome_failure_arbiter),
			start_after: UInt32.from(args.contract_outcome_failure_after),
			finish_before: UInt32.from(args.contract_outcome_failure_before)
		});

		const outcome_cancel: Outcome = new applicationState.Outcome({
			description: CircuitString.fromString(args.contract_outcome_cancel_description),
			payment_employer: UInt64.from(args.contract_outcome_cancel_employer),
			payment_contractor: UInt64.from(args.contract_outcome_cancel_contractor),
			payment_arbiter: UInt64.from(args.contract_outcome_cancel_arbiter),
			start_after: UInt32.from(args.contract_outcome_cancel_after),
			finish_before: UInt32.from(args.contract_outcome_cancel_before)
		});

		applicationState.preimage = new applicationState.Preimage({
			contract: CircuitString.fromString(args.contract_description),
			address: PublicKey.fromBase58(args.address),
			employer: PublicKey.fromBase58(args.employer),
			contractor: PublicKey.fromBase58(args.contractor),
			arbiter: PublicKey.fromBase58(args.arbiter),
			deposited: outcome_deposited,
			success: outcome_success,
			failure: outcome_failure,
			cancel: outcome_cancel
		});
	},
	proveTransaction: async (args: {}) => {
		await applicationState.transaction!.prove();
	},
	getTransactionJSON: async (args: {}) => {
		return applicationState.transaction!.toJSON();
	},
};

// ---------------------------------------------------------------------------------------

export type WorkerFunctions = keyof typeof functions;

export type ZkappWorkerRequest = {
	id: number,
	fn: WorkerFunctions,
	args: any
}

export type ZkappWorkerResponse = {
	id: number,
	data: any
}
self.addEventListener('message', async (event: MessageEvent<ZkappWorkerRequest>) => {
	const returnData = await functions[event.data.fn](event.data.args);
	const message: ZkappWorkerResponse = {
		id: event.data.id,
		data: returnData,
	};
	postMessage(message);
});
