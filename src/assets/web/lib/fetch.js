import 'isomorphic-fetch';
import { Field } from './core.js';
import { UInt32, UInt64 } from './int.js';
import { Actions, TokenId } from './account_update.js';
import { PublicKey } from './signature.js';
import { LedgerHash, EpochSeed, StateHash } from './base58-encodings.js';
import { accountQuery, fillPartialAccount, parseFetchedAccount, } from './mina/account.js';
export { fetchAccount, fetchLastBlock, checkZkappTransaction, parseFetchedAccount, markAccountToBeFetched, markNetworkToBeFetched, markActionsToBeFetched, fetchMissingData, fetchTransactionStatus, getCachedAccount, getCachedNetwork, getCachedActions, addCachedAccount, networkConfig, setGraphqlEndpoint, setGraphqlEndpoints, setMinaGraphqlFallbackEndpoints, setArchiveGraphqlEndpoint, setArchiveGraphqlFallbackEndpoints, sendZkappQuery, sendZkapp, removeJsonQuotes, fetchEvents, fetchActions, };
let networkConfig = {
    minaEndpoint: '',
    minaFallbackEndpoints: [],
    archiveEndpoint: '',
    archiveFallbackEndpoints: [],
};
function checkForValidUrl(url) {
    try {
        new URL(url);
        return true;
    }
    catch (e) {
        return false;
    }
}
function setGraphqlEndpoints([graphqlEndpoint, ...fallbackEndpoints]) {
    setGraphqlEndpoint(graphqlEndpoint);
    setMinaGraphqlFallbackEndpoints(fallbackEndpoints);
}
function setGraphqlEndpoint(graphqlEndpoint) {
    if (!checkForValidUrl(graphqlEndpoint)) {
        throw new Error(`Invalid GraphQL endpoint: ${graphqlEndpoint}. Please specify a valid URL.`);
    }
    networkConfig.minaEndpoint = graphqlEndpoint;
}
function setMinaGraphqlFallbackEndpoints(graphqlEndpoints) {
    if (graphqlEndpoints.some((endpoint) => !checkForValidUrl(endpoint))) {
        throw new Error(`Invalid GraphQL endpoint: ${graphqlEndpoints}. Please specify a valid URL.`);
    }
    networkConfig.minaFallbackEndpoints = graphqlEndpoints;
}
/**
 * Sets up a GraphQL endpoint to be used for fetching information from an Archive Node.
 *
 * @param A GraphQL endpoint.
 */
function setArchiveGraphqlEndpoint(graphqlEndpoint) {
    if (!checkForValidUrl(graphqlEndpoint)) {
        throw new Error(`Invalid GraphQL endpoint: ${graphqlEndpoint}. Please specify a valid URL.`);
    }
    networkConfig.archiveEndpoint = graphqlEndpoint;
}
function setArchiveGraphqlFallbackEndpoints(graphqlEndpoints) {
    if (graphqlEndpoints.some((endpoint) => !checkForValidUrl(endpoint))) {
        throw new Error(`Invalid GraphQL endpoint: ${graphqlEndpoints}. Please specify a valid URL.`);
    }
    networkConfig.archiveFallbackEndpoints = graphqlEndpoints;
}
/**
 * Gets account information on the specified publicKey by performing a GraphQL query
 * to the specified endpoint. This will call the 'GetAccountInfo' query which fetches
 * zkapp related account information.
 *
 * If an error is returned by the specified endpoint, an error is thrown. Otherwise,
 * the data is returned.
 *
 * @param publicKey The specified publicKey to get account information on
 * @param tokenId The specified tokenId to get account information on
 * @param graphqlEndpoint The graphql endpoint to fetch from
 * @param config An object that exposes an additional timeout option
 * @returns zkapp information on the specified account or an error is thrown
 */
async function fetchAccount(accountInfo, graphqlEndpoint = networkConfig.minaEndpoint, { timeout = defaultTimeout } = {}) {
    let publicKeyBase58 = accountInfo.publicKey instanceof PublicKey
        ? accountInfo.publicKey.toBase58()
        : accountInfo.publicKey;
    let tokenIdBase58 = typeof accountInfo.tokenId === 'string' || !accountInfo.tokenId
        ? accountInfo.tokenId
        : TokenId.toBase58(accountInfo.tokenId);
    return await fetchAccountInternal({ publicKey: publicKeyBase58, tokenId: tokenIdBase58 }, graphqlEndpoint, {
        timeout,
    });
}
// internal version of fetchAccount which does the same, but returns the original JSON version
// of the account, to save some back-and-forth conversions when caching accounts
async function fetchAccountInternal(accountInfo, graphqlEndpoint = networkConfig.minaEndpoint, config) {
    const { publicKey, tokenId } = accountInfo;
    let [response, error] = await makeGraphqlRequest(accountQuery(publicKey, tokenId ?? TokenId.toBase58(TokenId.default)), graphqlEndpoint, networkConfig.minaFallbackEndpoints, config);
    if (error !== undefined)
        return { account: undefined, error };
    let fetchedAccount = response.data
        .account;
    if (fetchedAccount === null) {
        return {
            account: undefined,
            error: {
                statusCode: 404,
                statusText: `fetchAccount: Account with public key ${publicKey} does not exist.`,
            },
        };
    }
    let account = parseFetchedAccount(fetchedAccount);
    // account successfully fetched - add to cache before returning
    addCachedAccountInternal(account, graphqlEndpoint);
    return {
        account,
        error: undefined,
    };
}
// Specify 5min as the default timeout
const defaultTimeout = 5 * 60 * 1000;
let accountCache = {};
let networkCache = {};
let actionsCache = {};
let accountsToFetch = {};
let networksToFetch = {};
let actionsToFetch = {};
function markAccountToBeFetched(publicKey, tokenId, graphqlEndpoint) {
    let publicKeyBase58 = publicKey.toBase58();
    let tokenBase58 = TokenId.toBase58(tokenId);
    accountsToFetch[`${publicKeyBase58};${tokenBase58};${graphqlEndpoint}`] = {
        publicKey: publicKeyBase58,
        tokenId: tokenBase58,
        graphqlEndpoint,
    };
}
function markNetworkToBeFetched(graphqlEndpoint) {
    networksToFetch[graphqlEndpoint] = { graphqlEndpoint };
}
function markActionsToBeFetched(publicKey, tokenId, graphqlEndpoint, actionStates = {}) {
    let publicKeyBase58 = publicKey.toBase58();
    let tokenBase58 = TokenId.toBase58(tokenId);
    let { fromActionState, endActionState } = actionStates;
    let fromActionStateBase58 = fromActionState
        ? fromActionState.toString()
        : undefined;
    let endActionStateBase58 = endActionState
        ? endActionState.toString()
        : undefined;
    actionsToFetch[`${publicKeyBase58};${tokenBase58};${graphqlEndpoint}`] = {
        publicKey: publicKeyBase58,
        tokenId: tokenBase58,
        actionStates: {
            fromActionState: fromActionStateBase58,
            endActionState: endActionStateBase58,
        },
        graphqlEndpoint,
    };
}
async function fetchMissingData(graphqlEndpoint, archiveEndpoint) {
    let promises = Object.entries(accountsToFetch).map(async ([key, { publicKey, tokenId }]) => {
        let response = await fetchAccountInternal({ publicKey, tokenId }, graphqlEndpoint);
        if (response.error === undefined)
            delete accountsToFetch[key];
    });
    let actionPromises = Object.entries(actionsToFetch).map(async ([key, { publicKey, actionStates, tokenId }]) => {
        let response = await fetchActions({ publicKey, actionStates, tokenId }, archiveEndpoint);
        if (!('error' in response) || response.error === undefined)
            delete actionsToFetch[key];
    });
    promises.push(...actionPromises);
    let network = Object.entries(networksToFetch).find(([, network]) => {
        return network.graphqlEndpoint === graphqlEndpoint;
    });
    if (network !== undefined) {
        promises.push((async () => {
            try {
                await fetchLastBlock(graphqlEndpoint);
                delete networksToFetch[network[0]];
            }
            catch { }
        })());
    }
    await Promise.all(promises);
}
function getCachedAccount(publicKey, tokenId, graphqlEndpoint = networkConfig.minaEndpoint) {
    return accountCache[accountCacheKey(publicKey, tokenId, graphqlEndpoint)]
        ?.account;
}
function getCachedNetwork(graphqlEndpoint = networkConfig.minaEndpoint) {
    return networkCache[graphqlEndpoint]?.network;
}
function getCachedActions(publicKey, tokenId, graphqlEndpoint = networkConfig.archiveEndpoint) {
    return actionsCache[accountCacheKey(publicKey, tokenId, graphqlEndpoint)]
        ?.actions;
}
/**
 * Adds an account to the local cache, indexed by a GraphQL endpoint.
 */
function addCachedAccount(partialAccount, graphqlEndpoint = networkConfig.minaEndpoint) {
    let account = fillPartialAccount(partialAccount);
    addCachedAccountInternal(account, graphqlEndpoint);
}
function addCachedAccountInternal(account, graphqlEndpoint) {
    accountCache[accountCacheKey(account.publicKey, account.tokenId, graphqlEndpoint)] = {
        account,
        graphqlEndpoint,
        timestamp: Date.now(),
    };
}
function addCachedActions({ publicKey, tokenId }, actions, graphqlEndpoint) {
    actionsCache[`${publicKey};${tokenId};${graphqlEndpoint}`] = {
        actions,
        graphqlEndpoint,
        timestamp: Date.now(),
    };
}
function accountCacheKey(publicKey, tokenId, graphqlEndpoint) {
    return `${publicKey.toBase58()};${TokenId.toBase58(tokenId)};${graphqlEndpoint}`;
}
/**
 * Fetches the last block on the Mina network.
 */
async function fetchLastBlock(graphqlEndpoint = networkConfig.minaEndpoint) {
    let [resp, error] = await makeGraphqlRequest(lastBlockQuery, graphqlEndpoint, networkConfig.minaFallbackEndpoints);
    if (error)
        throw Error(error.statusText);
    let lastBlock = resp?.data?.bestChain?.[0];
    if (lastBlock === undefined) {
        throw Error('Failed to fetch latest network state.');
    }
    let network = parseFetchedBlock(lastBlock);
    networkCache[graphqlEndpoint] = {
        network,
        graphqlEndpoint,
        timestamp: Date.now(),
    };
    return network;
}
const lastBlockQuery = `{
  bestChain(maxLength: 1) {
    protocolState {
      blockchainState {
        snarkedLedgerHash
        stagedLedgerHash
        date
        utcDate
        stagedLedgerProofEmitted
      }
      previousStateHash
      consensusState {
        blockHeight
        slotSinceGenesis
        slot
        nextEpochData {
          ledger {hash totalCurrency}
          seed
          startCheckpoint
          lockCheckpoint
          epochLength
        }
        stakingEpochData {
          ledger {hash totalCurrency}
          seed
          startCheckpoint
          lockCheckpoint
          epochLength
        }
        epochCount
        minWindowDensity
        totalCurrency
        epoch
      }
    }
  }
}`;
const lastBlockQueryFailureCheck = `{
  bestChain(maxLength: 1) {
    transactions {
      zkappCommands {
        hash
        failureReason {
          failures
          index
        }
      }
    }
  }
}`;
async function fetchLatestBlockZkappStatus(graphqlEndpoint = networkConfig.minaEndpoint) {
    let [resp, error] = await makeGraphqlRequest(lastBlockQueryFailureCheck, graphqlEndpoint, networkConfig.minaFallbackEndpoints);
    if (error)
        throw Error(`Error making GraphQL request: ${error.statusText}`);
    let bestChain = resp?.data;
    if (bestChain === undefined) {
        throw Error('Failed to fetch the latest zkApp transaction status. The response data is undefined.');
    }
    return bestChain;
}
async function checkZkappTransaction(txnId) {
    let bestChainBlocks = await fetchLatestBlockZkappStatus();
    for (let block of bestChainBlocks.bestChain) {
        for (let zkappCommand of block.transactions.zkappCommands) {
            if (zkappCommand.hash === txnId) {
                if (zkappCommand.failureReason !== null) {
                    let failureReason = zkappCommand.failureReason
                        .reverse()
                        .map((failure) => {
                        return ` AccountUpdate #${failure.index} failed. Reason: "${failure.failures.join(', ')}"`;
                    });
                    return {
                        success: false,
                        failureReason,
                    };
                }
                else {
                    return {
                        success: true,
                        failureReason: null,
                    };
                }
            }
        }
    }
    return {
        success: false,
        failureReason: null,
    };
}
function parseFetchedBlock({ protocolState: { blockchainState: { snarkedLedgerHash, utcDate }, consensusState: { blockHeight, minWindowDensity, totalCurrency, slot, slotSinceGenesis, nextEpochData, stakingEpochData, }, }, }) {
    return {
        snarkedLedgerHash: LedgerHash.fromBase58(snarkedLedgerHash),
        // TODO: use date or utcDate?
        blockchainLength: UInt32.from(blockHeight),
        minWindowDensity: UInt32.from(minWindowDensity),
        totalCurrency: UInt64.from(totalCurrency),
        globalSlotSinceGenesis: UInt32.from(slotSinceGenesis),
        nextEpochData: parseEpochData(nextEpochData),
        stakingEpochData: parseEpochData(stakingEpochData),
    };
}
function parseEpochData({ ledger: { hash, totalCurrency }, seed, startCheckpoint, lockCheckpoint, epochLength, }) {
    return {
        ledger: {
            hash: LedgerHash.fromBase58(hash),
            totalCurrency: UInt64.from(totalCurrency),
        },
        seed: EpochSeed.fromBase58(seed),
        startCheckpoint: StateHash.fromBase58(startCheckpoint),
        lockCheckpoint: StateHash.fromBase58(lockCheckpoint),
        epochLength: UInt32.from(epochLength),
    };
}
const transactionStatusQuery = (txId) => `query {
  transactionStatus(zkappTransaction:"${txId}")
}`;
/**
 * Fetches the status of a transaction.
 */
async function fetchTransactionStatus(txId, graphqlEndpoint = networkConfig.minaEndpoint) {
    let [resp, error] = await makeGraphqlRequest(transactionStatusQuery(txId), graphqlEndpoint, networkConfig.minaFallbackEndpoints);
    if (error)
        throw Error(error.statusText);
    let txStatus = resp?.data?.transactionStatus;
    if (txStatus === undefined || txStatus === null) {
        throw Error(`Failed to fetch transaction status. TransactionId: ${txId}`);
    }
    return txStatus;
}
/**
 * Sends a zkApp command (transaction) to the specified GraphQL endpoint.
 */
function sendZkapp(json, graphqlEndpoint = networkConfig.minaEndpoint, { timeout = defaultTimeout } = {}) {
    return makeGraphqlRequest(sendZkappQuery(json), graphqlEndpoint, networkConfig.minaFallbackEndpoints, {
        timeout,
    });
}
// TODO: Decide an appropriate response structure.
function sendZkappQuery(json) {
    return `mutation {
  sendZkapp(input: {
    zkappCommand: ${removeJsonQuotes(json)}
  }) {
    zkapp {
      hash
      id
      failureReason {
        failures
        index
      }
      zkappCommand {
        memo
        feePayer {
          body {
            publicKey
          }
        }
        accountUpdates {
          body {
            publicKey
            useFullCommitment
            incrementNonce
          }
        }
      }
    }
  }
}
`;
}
const getEventsQuery = (publicKey, tokenId, filterOptions) => {
    const { to, from } = filterOptions ?? {};
    let input = `address: "${publicKey}", tokenId: "${tokenId}"`;
    if (to !== undefined) {
        input += `, to: ${to}`;
    }
    if (from !== undefined) {
        input += `, from: ${from}`;
    }
    return `{
  events(input: { ${input} }) {
    blockInfo {
      distanceFromMaxBlockHeight
      height
      globalSlotSinceGenesis
      stateHash
      parentHash
      chainStatus
    }
    eventData {
      transactionInfo {
        hash
        memo
        status
      }
      data
    }
  }
}`;
};
const getActionsQuery = (publicKey, actionStates, tokenId, _filterOptions) => {
    const { fromActionState, endActionState } = actionStates ?? {};
    let input = `address: "${publicKey}", tokenId: "${tokenId}"`;
    if (fromActionState !== undefined) {
        input += `, fromActionState: "${fromActionState}"`;
    }
    if (endActionState !== undefined) {
        input += `, endActionState: "${endActionState}"`;
    }
    return `{
  actions(input: { ${input} }) {
    blockInfo {
      distanceFromMaxBlockHeight
    }
    actionState {
      actionStateOne
      actionStateTwo
    }
    actionData {
      accountUpdateId
      data
    }
  }
}`;
};
/**
 * Asynchronously fetches event data for an account from the Mina Archive Node GraphQL API.
 * @async
 * @param accountInfo - The account information object.
 * @param accountInfo.publicKey - The account public key.
 * @param [accountInfo.tokenId] - The optional token ID for the account.
 * @param [graphqlEndpoint=networkConfig.archiveEndpoint] - The GraphQL endpoint to query. Defaults to the Archive Node GraphQL API.
 * @param [filterOptions={}] - The optional filter options object.
 * @returns A promise that resolves to an array of objects containing event data, block information and transaction information for the account.
 * @throws If the GraphQL request fails or the response is invalid.
 * @example
 * const accountInfo = { publicKey: 'B62qiwmXrWn7Cok5VhhB3KvCwyZ7NHHstFGbiU5n7m8s2RqqNW1p1wF' };
 * const events = await fetchEvents(accountInfo);
 * console.log(events);
 */
async function fetchEvents(accountInfo, graphqlEndpoint = networkConfig.archiveEndpoint, filterOptions = {}) {
    if (!graphqlEndpoint)
        throw new Error('fetchEvents: Specified GraphQL endpoint is undefined. Please specify a valid endpoint.');
    const { publicKey, tokenId } = accountInfo;
    let [response, error] = await makeGraphqlRequest(getEventsQuery(publicKey, tokenId ?? TokenId.toBase58(TokenId.default), filterOptions), graphqlEndpoint, networkConfig.archiveFallbackEndpoints);
    if (error)
        throw Error(error.statusText);
    let fetchedEvents = response?.data.events;
    if (fetchedEvents === undefined) {
        throw Error(`Failed to fetch events data. Account: ${publicKey} Token: ${tokenId}`);
    }
    // TODO: This is a temporary fix. We should be able to fetch the event/action data from any block at the best tip.
    // Once https://github.com/o1-labs/Archive-Node-API/issues/7 is resolved, we can remove this.
    // If we have multiple blocks returned at the best tip (e.g. distanceFromMaxBlockHeight === 0),
    // then filter out the blocks at the best tip. This is because we cannot guarantee that every block
    // at the best tip will have the correct event data or guarantee that the specific block data will not
    // fork in anyway. If this happens, we delay fetching event data until another block has been added to the network.
    let numberOfBestTipBlocks = 0;
    for (let i = 0; i < fetchedEvents.length; i++) {
        if (fetchedEvents[i].blockInfo.distanceFromMaxBlockHeight === 0) {
            numberOfBestTipBlocks++;
        }
        if (numberOfBestTipBlocks > 1) {
            fetchedEvents = fetchedEvents.filter((event) => {
                return event.blockInfo.distanceFromMaxBlockHeight !== 0;
            });
            break;
        }
    }
    return fetchedEvents.map((event) => {
        let events = event.eventData.map(({ data, transactionInfo }) => {
            return {
                data,
                transactionInfo,
            };
        });
        return {
            events,
            blockHeight: UInt32.from(event.blockInfo.height),
            blockHash: event.blockInfo.stateHash,
            parentBlockHash: event.blockInfo.parentHash,
            globalSlot: UInt32.from(event.blockInfo.globalSlotSinceGenesis),
            chainStatus: event.blockInfo.chainStatus,
        };
    });
}
async function fetchActions(accountInfo, graphqlEndpoint = networkConfig.archiveEndpoint) {
    if (!graphqlEndpoint)
        throw new Error('fetchActions: Specified GraphQL endpoint is undefined. Please specify a valid endpoint.');
    const { publicKey, actionStates, tokenId = TokenId.toBase58(TokenId.default), } = accountInfo;
    let [response, error] = await makeGraphqlRequest(getActionsQuery(publicKey, actionStates, tokenId), graphqlEndpoint, networkConfig.archiveFallbackEndpoints);
    if (error)
        throw Error(error.statusText);
    let fetchedActions = response?.data.actions;
    if (fetchedActions === undefined) {
        return {
            error: {
                statusCode: 404,
                statusText: `fetchActions: Account with public key ${publicKey} with tokenId ${tokenId} does not exist.`,
            },
        };
    }
    // TODO: This is a temporary fix. We should be able to fetch the event/action data from any block at the best tip.
    // Once https://github.com/o1-labs/Archive-Node-API/issues/7 is resolved, we can remove this.
    // If we have multiple blocks returned at the best tip (e.g. distanceFromMaxBlockHeight === 0),
    // then filter out the blocks at the best tip. This is because we cannot guarantee that every block
    // at the best tip will have the correct action data or guarantee that the specific block data will not
    // fork in anyway. If this happens, we delay fetching action data until another block has been added to the network.
    let numberOfBestTipBlocks = 0;
    for (let i = 0; i < fetchedActions.length; i++) {
        if (fetchedActions[i].blockInfo.distanceFromMaxBlockHeight === 0) {
            numberOfBestTipBlocks++;
        }
        if (numberOfBestTipBlocks > 1) {
            fetchedActions = fetchedActions.filter((action) => {
                return action.blockInfo.distanceFromMaxBlockHeight !== 0;
            });
            break;
        }
    }
    // Archive Node API returns actions in the latest order, so we reverse the array to get the actions in chronological order.
    fetchedActions.reverse();
    let actionsList = [];
    // correct for archive node sending one block too many
    if (fetchedActions.length !== 0 &&
        fetchedActions[0].actionState.actionStateOne ===
            actionStates.fromActionState) {
        fetchedActions = fetchedActions.slice(1);
    }
    fetchedActions.forEach((actionBlock) => {
        let { actionData } = actionBlock;
        let latestActionState = Field(actionBlock.actionState.actionStateTwo);
        let actionState = actionBlock.actionState.actionStateOne;
        if (actionData.length === 0)
            throw Error(`No action data was found for the account ${publicKey} with the latest action state ${actionState}`);
        // split actions by account update
        let actionsByAccountUpdate = [];
        let currentAccountUpdateId = 'none';
        let currentActions;
        actionData.forEach(({ accountUpdateId, data }) => {
            if (accountUpdateId === currentAccountUpdateId) {
                currentActions.push(data);
            }
            else {
                currentAccountUpdateId = accountUpdateId;
                currentActions = [data];
                actionsByAccountUpdate.push(currentActions);
            }
        });
        // re-hash actions
        for (let actions of actionsByAccountUpdate) {
            latestActionState = updateActionState(actions, latestActionState);
            actionsList.push({ actions, hash: latestActionState.toString() });
        }
        const finalActionState = latestActionState.toString();
        const expectedActionState = actionState;
        if (finalActionState !== expectedActionState) {
            throw new Error(`Failed to derive correct actions hash for ${publicKey}.
        Derived hash: ${finalActionState}, expected hash: ${expectedActionState}).
        All action hashes derived: ${JSON.stringify(actionsList, null, 2)}
        Please try a different Archive Node API endpoint.
        `);
        }
    });
    addCachedActions({ publicKey, tokenId }, actionsList, graphqlEndpoint);
    return actionsList;
}
function updateActionState(actions, actionState) {
    let actionHash = Actions.fromJSON(actions).hash;
    return Actions.updateSequenceState(actionState, actionHash);
}
// removes the quotes on JSON keys
function removeJsonQuotes(json) {
    let cleaned = JSON.stringify(JSON.parse(json), null, 2);
    return cleaned.replace(/\"(\S+)\"\s*:/gm, '$1:');
}
// TODO it seems we're not actually catching most errors here
async function makeGraphqlRequest(query, graphqlEndpoint = networkConfig.minaEndpoint, fallbackEndpoints, { timeout = defaultTimeout } = {}) {
    if (graphqlEndpoint === 'none')
        throw Error("Should have made a graphql request, but don't know to which endpoint. Try calling `setGraphqlEndpoint` first.");
    let timeouts = [];
    const clearTimeouts = () => {
        timeouts.forEach((t) => clearTimeout(t));
        timeouts = [];
    };
    const makeRequest = async (url) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        timeouts.push(timer);
        let body = JSON.stringify({ operationName: null, query, variables: {} });
        try {
            let response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
                signal: controller.signal,
            });
            return checkResponseStatus(response);
        }
        finally {
            clearTimeouts();
        }
    };
    // try to fetch from endpoints in pairs
    let timeoutErrors = [];
    let urls = [graphqlEndpoint, ...fallbackEndpoints];
    for (let i = 0; i < urls.length; i += 2) {
        let url1 = urls[i];
        let url2 = urls[i + 1];
        if (url2 === undefined) {
            try {
                return await makeRequest(url1);
            }
            catch (error) {
                return [undefined, inferError(error)];
            }
        }
        try {
            return await Promise.race([makeRequest(url1), makeRequest(url2)]);
        }
        catch (unknownError) {
            let error = inferError(unknownError);
            if (error.statusCode === 408) {
                // If the request timed out, try the next 2 endpoints
                timeoutErrors.push({ url1, url2, error });
            }
            else {
                // If the request failed for some other reason (e.g. o1js error), return the error
                return [undefined, error];
            }
        }
    }
    const statusText = timeoutErrors
        .map(({ url1, url2, error }) => `Request to ${url1} and ${url2} timed out. Error: ${error}`)
        .join('\n');
    return [undefined, { statusCode: 408, statusText }];
}
async function checkResponseStatus(response) {
    if (response.ok) {
        let jsonResponse = await response.json();
        if (jsonResponse.errors && jsonResponse.errors.length > 0) {
            return [
                undefined,
                {
                    statusCode: response.status,
                    statusText: jsonResponse.errors
                        .map((error) => error.message)
                        .join('\n'),
                },
            ];
        }
        else if (jsonResponse.data === undefined) {
            return [
                undefined,
                {
                    statusCode: response.status,
                    statusText: `GraphQL response data is undefined`,
                },
            ];
        }
        return [jsonResponse, undefined];
    }
    else {
        return [
            undefined,
            {
                statusCode: response.status,
                statusText: response.statusText,
            },
        ];
    }
}
function inferError(error) {
    let errorMessage = JSON.stringify(error);
    if (error instanceof AbortSignal) {
        return { statusCode: 408, statusText: `Request Timeout: ${errorMessage}` };
    }
    else {
        return {
            statusCode: 500,
            statusText: `Unknown Error: ${errorMessage}`,
        };
    }
}
//# sourceMappingURL=fetch.js.map