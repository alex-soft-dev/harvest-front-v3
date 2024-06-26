import axios from 'axios'
import { get } from 'lodash'
import { CHAIN_IDS } from '../data/constants'
import {
  GRAPH_URL_MAINNET,
  GRAPH_URL_POLYGON,
  GRAPH_URL_ARBITRUM,
  GRAPH_URL_BASE,
  TOTAL_TVL_API_ENDPOINT,
} from '../constants'
import { fromWei } from '../services/web3'

export const getLastHarvestInfo = async (address, chainId) => {
  // eslint-disable-next-line no-unused-vars
  let nowDate = new Date(),
    data = {},
    result = ''

  nowDate = Math.floor(nowDate.setDate(nowDate.getDate()) / 1000)

  const myHeaders = new Headers()
  myHeaders.append('Content-Type', 'application/json')

  address = address.toLowerCase()
  const farm = '0xa0246c9032bc3a600820415ae600c6388619a14d'
  const ifarm = '0x1571ed0bed4d987fe2b498ddbae7dfa19519f651'

  const graphql = JSON.stringify({
      query: `{
        vaultHistories(
          first: 1,
          where: {
            vault: "${address === farm ? ifarm : address}",
          },
          orderBy: timestamp,
          orderDirection: desc
        ) {
          timestamp
        }
      }`,
      variables: {},
    }),
    requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: graphql,
      redirect: 'follow',
    }

  const url =
    chainId === CHAIN_IDS.ETH_MAINNET
      ? GRAPH_URL_MAINNET
      : chainId === CHAIN_IDS.POLYGON_MAINNET
      ? GRAPH_URL_POLYGON
      : chainId === CHAIN_IDS.BASE
      ? GRAPH_URL_BASE
      : GRAPH_URL_ARBITRUM

  try {
    await fetch(url, requestOptions)
      .then(response => response.json())
      .then(res => {
        data = res.data.vaultHistories
        if (data.length !== 0) {
          const timeStamp = data[0].timestamp
          let duration = Number(nowDate) - Number(timeStamp),
            day = 0,
            hour = 0,
            min = 0
          // calculate (and subtract) whole days
          day = Math.floor(duration / 86400)
          duration -= day * 86400

          // calculate (and subtract) whole hours
          hour = Math.floor(duration / 3600) % 24
          duration -= hour * 3600

          // calculate (and subtract) whole minutes
          min = Math.floor(duration / 60) % 60

          const dayString = `${day > 0 ? `${day}d` : ''}`
          const hourString = `${hour > 0 ? `${hour}h` : ''}`
          const minString = `${min > 0 ? `${min}m` : ''}`
          result = `${
            `${dayString !== '' ? `${dayString} ` : ''}` +
            `${hourString !== '' ? `${hourString} ` : ''}`
          }${minString}`
        }
      })
      .catch(error => console.log('error', error))
  } catch (err) {
    console.log('Fetch data about last harvest: ', err)
  }
  return result
}

export const getPublishDate = async () => {
  const allData = [],
    allFlags = []

  const myHeaders = new Headers()
  myHeaders.append('Content-Type', 'application/json')

  const graphqlQueries = [
    {
      url: GRAPH_URL_MAINNET,
      query: `{
        vaults(
          first: 1000,
          orderBy: createAtBlock,
          orderDirection: desc
        ) {
          id, timestamp
        }
      }`,
    },
    {
      url: GRAPH_URL_POLYGON,
      query: `{
        vaults(
          first: 1000,
          orderBy: createAtBlock,
          orderDirection: desc
        ) {
          id, timestamp
        }
      }`,
    },
    {
      url: GRAPH_URL_BASE,
      query: `{
        vaults(
          first: 1000,
          orderBy: createAtBlock,
          orderDirection: desc
        ) {
          id, timestamp
        }
      }`,
    },
    {
      url: GRAPH_URL_ARBITRUM,
      query: `{
        vaults(
          first: 1000,
          orderBy: createAtBlock,
          orderDirection: desc
        ) {
          id, timestamp
        }
      }`,
    },
  ]

  try {
    const requests = graphqlQueries.map(({ url, query }) => {
      const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: JSON.stringify({ query }),
        redirect: 'follow',
      }
      return fetch(url, requestOptions)
        .then(response => response.json())
        .then(res => {
          const data = res.data.vaults || []
          const flag = data.length > 0
          allData.push(data)
          allFlags.push(flag)
        })
        .catch(error => {
          console.log('Error fetching data from URL:', url, error)
          allFlags.push(false)
        })
    })

    await Promise.all(requests)
  } catch (err) {
    console.log('Error fetching data:', err)
    return { data: [], flags: [] }
  }

  const combinedData = allData.reduce((acc, curr) => acc.concat(curr), [])
  const combinedFlags = allFlags.every(flag => flag)
  return { data: combinedData, flag: combinedFlags }
}

export const getVaultHistories = async (address, chainId) => {
  let vaultHData = {},
    vaultHFlag = true

  const myHeaders = new Headers()
  myHeaders.append('Content-Type', 'application/json')

  address = address.toLowerCase()
  const farm = '0xa0246c9032bc3a600820415ae600c6388619a14d'
  const ifarm = '0x1571ed0bed4d987fe2b498ddbae7dfa19519f651'

  const graphql = JSON.stringify({
      query: `{
        vaultHistories(
          first: 1000,
          where: {
            vault: "${address === farm ? ifarm : address}",
          },
          orderBy: timestamp,
          orderDirection: desc
        ) {
          priceUnderlying, sharePrice, timestamp
        }
      }`,
      variables: {},
    }),
    requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: graphql,
      redirect: 'follow',
    }

  const url =
    chainId === CHAIN_IDS.ETH_MAINNET
      ? GRAPH_URL_MAINNET
      : chainId === CHAIN_IDS.POLYGON_MAINNET
      ? GRAPH_URL_POLYGON
      : chainId === CHAIN_IDS.BASE
      ? GRAPH_URL_BASE
      : GRAPH_URL_ARBITRUM

  try {
    await fetch(url, requestOptions)
      .then(response => response.json())
      .then(res => {
        vaultHData = res.data.vaultHistories
        if (vaultHData.length === 0) {
          vaultHFlag = false
        }
      })
      .catch(error => {
        console.log('error', error)
        vaultHFlag = false
      })
  } catch (err) {
    console.log('Fetch data about price feed: ', err)
    vaultHFlag = false
  }
  return { vaultHData, vaultHFlag }
}

export const getDataQuery = async (ago, address, chainId, myWallet) => {
  let nowDate = new Date(),
    data = {}
  nowDate = Math.floor(nowDate.setDate(nowDate.getDate() - 1) / 1000)
  const startDate = nowDate - 3600 * 24 * ago

  address = address.toLowerCase()
  const farm = '0xa0246c9032bc3a600820415ae600c6388619a14d'
  const ifarm = '0x1571ed0bed4d987fe2b498ddbae7dfa19519f651'

  address = address.toLowerCase()
  if (myWallet) {
    myWallet = myWallet.toLowerCase()
  }
  const myHeaders = new Headers()
  myHeaders.append('Content-Type', 'application/json')

  const graphql = JSON.stringify({
      query: `{
        generalApies(
          first: 1000,
          where: {
            vault: "${address === farm ? ifarm : address}",
            timestamp_gte: "${startDate}"
          }, 
          orderBy: timestamp, 
          orderDirection: desc
        ) { 
          apy, timestamp
        }
        tvls(
          first: 1000,
          where: {
            vault: "${address === farm ? ifarm : address}", 
            timestamp_gte: "${startDate}"
          },
          orderBy: timestamp,
          orderDirection: desc
        ) {
          value, timestamp
        },
        vaultHistories(
          first: 1000,
          where: {
            vault: "${address === farm ? ifarm : address}",
          },
          orderBy: timestamp,
          orderDirection: desc
        ) {
          priceUnderlying, sharePrice, timestamp
        }
      }`,
      variables: {},
    }),
    requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: graphql,
      redirect: 'follow',
    }
  const url =
    chainId === CHAIN_IDS.ETH_MAINNET
      ? GRAPH_URL_MAINNET
      : chainId === CHAIN_IDS.POLYGON_MAINNET
      ? GRAPH_URL_POLYGON
      : chainId === CHAIN_IDS.BASE
      ? GRAPH_URL_BASE
      : GRAPH_URL_ARBITRUM

  try {
    await fetch(url, requestOptions)
      .then(response => response.json())
      .then(result => {
        data = result.data
      })
      .catch(error => console.log('error', error))
  } catch (err) {
    console.log('Fetch data about subgraph: ', err)
  }

  return data
}

export const getUserBalanceHistories = async (address, chainId, account) => {
  let balanceData = {},
    balanceFlag = true

  address = address.toLowerCase()
  const farm = '0xa0246c9032bc3a600820415ae600c6388619a14d'
  const ifarm = '0x1571ed0bed4d987fe2b498ddbae7dfa19519f651'
  if (account) {
    account = account.toLowerCase()
  }

  const myHeaders = new Headers()
  myHeaders.append('Content-Type', 'application/json')

  const graphql = JSON.stringify({
      query: `{
        userBalanceHistories(
          first: 1000,
          where: {
            vault: "${address === farm ? ifarm : address}",
            userAddress: "${account}"
          },
          orderBy: timestamp,
          orderDirection: desc,
        ) {
          value, timestamp
        }
      }`,
      variables: {},
    }),
    requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: graphql,
      redirect: 'follow',
    }

  const url =
    chainId === CHAIN_IDS.ETH_MAINNET
      ? GRAPH_URL_MAINNET
      : chainId === CHAIN_IDS.POLYGON_MAINNET
      ? GRAPH_URL_POLYGON
      : chainId === CHAIN_IDS.BASE
      ? GRAPH_URL_BASE
      : GRAPH_URL_ARBITRUM

  try {
    await fetch(url, requestOptions)
      .then(response => response.json())
      .then(res => {
        balanceData = res.data.userBalanceHistories
        if (balanceData.length === 0) {
          balanceFlag = false
        }
      })
      .catch(error => {
        console.log('error', error)
        balanceFlag = false
      })
  } catch (err) {
    console.log('Fetch data about user balance histories: ', err)
    balanceFlag = false
  }
  return { balanceData, balanceFlag }
}

export const getPriceFeeds = async (address, chainId, timestamp, asQuery, priceFeedData = []) => {
  let priceFeedFlag = true

  address = address.toLowerCase()
  const timestampQuery = timestamp && asQuery ? `timestamp_lt: "${timestamp}"` : ''

  const myHeaders = new Headers()
  myHeaders.append('Content-Type', 'application/json')

  const graphql = JSON.stringify({
      query: `{
        priceFeeds(
          first: 1000,
          where: {
            vault: "${address}",
            ${timestampQuery}
          },
          orderBy: timestamp,
          orderDirection: desc,
        ) {
          sharePrice, price, timestamp
        }
      }`,
      variables: {},
    }),
    requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: graphql,
      redirect: 'follow',
    }

  const url =
    chainId === CHAIN_IDS.ETH_MAINNET
      ? GRAPH_URL_MAINNET
      : chainId === CHAIN_IDS.POLYGON_MAINNET
      ? GRAPH_URL_POLYGON
      : chainId === CHAIN_IDS.BASE
      ? GRAPH_URL_BASE
      : GRAPH_URL_ARBITRUM

  try {
    const response = await fetch(url, requestOptions)
    const responseJson = await response.json()

    if (
      responseJson.data &&
      responseJson.data.priceFeeds &&
      Array.isArray(responseJson.data.priceFeeds)
    ) {
      priceFeedData.push(...responseJson.data.priceFeeds)
      const dataTimestamp = priceFeedData[priceFeedData.length - 1].timestamp
      if (dataTimestamp > timestamp) {
        await getPriceFeeds(address, chainId, dataTimestamp, true, priceFeedData)
      }
    } else {
      console.error('Error: Unable to retrieve vault histories from the response.')
    }

    if (priceFeedData.length === 0) {
      priceFeedFlag = false
    }
  } catch (err) {
    console.log('Fetch data about user balance histories: ', err)
    priceFeedFlag = false
  }
  return { priceFeedData, priceFeedFlag }
}

const removeZeroValueObjects = data => {
  let nonZeroValueEncountered = false
  for (let i = data.length - 1; i >= 0; i -= 1) {
    if (parseFloat(data[i].value) === 0 || data[i].value === '0') {
      if (!nonZeroValueEncountered) {
        data.splice(i, 1)
      }
    } else {
      nonZeroValueEncountered = true
    }
  }
  return data
}

export const initBalanceAndDetailData = async (
  address,
  chainId,
  account,
  tokenDecimals,
  underlyingPrice,
) => {
  const timestamps = []
  const uniqueVaultHData = []
  const mergedData = []
  let enrichedData = [],
    sumNetChange = 0,
    sumNetChangeUsd = 0,
    sumLatestNetChange = 0,
    sumLatestNetChangeUsd = 0

  const { balanceData, balanceFlag } = await getUserBalanceHistories(address, chainId, account)
  const { vaultHData, vaultHFlag } = await getVaultHistories(address, chainId)

  if (vaultHFlag) {
    vaultHData.forEach(obj => {
      if (!timestamps.includes(obj.timestamp)) {
        timestamps.push(obj.timestamp)
        const sharePriceDecimals = fromWei(obj.sharePrice, tokenDecimals, tokenDecimals)
        const modifiedObj = { ...obj, sharePrice: sharePriceDecimals }
        uniqueVaultHData.push(modifiedObj)
      }
    })
  }

  if (balanceFlag && vaultHFlag) {
    let uniqueData = [],
      lastUserEvent = false
    if (balanceData[0].timestamp > uniqueVaultHData[0].timestamp) {
      let i = 0,
        z = 0,
        addFlag = false

      while (balanceData[i]?.timestamp > uniqueVaultHData[0].timestamp) {
        balanceData[i].priceUnderlying = uniqueVaultHData[0].priceUnderlying
        balanceData[i].sharePrice = uniqueVaultHData[0].sharePrice
        mergedData.push(balanceData[i])
        i += 1
      }
      while (i < balanceData.length) {
        if (z < uniqueVaultHData.length) {
          while (uniqueVaultHData[z].timestamp >= balanceData[i].timestamp) {
            uniqueVaultHData[z].value = balanceData[i].value
            mergedData.push(uniqueVaultHData[z])
            z += 1
            if (!addFlag && uniqueVaultHData[z].timestamp === balanceData[i].timestamp) {
              addFlag = true
            }
          }
        }
        if (!addFlag) {
          balanceData[i].priceUnderlying =
            uniqueVaultHData[z === uniqueVaultHData.length ? z - 1 : z].priceUnderlying
          balanceData[i].sharePrice =
            uniqueVaultHData[z === uniqueVaultHData.length ? z - 1 : z].sharePrice
          mergedData.push(balanceData[i])
        }
        addFlag = false
        i += 1
      }
      while (z < uniqueVaultHData.length) {
        uniqueVaultHData[z].value = 0
        mergedData.push(uniqueVaultHData[z])
        z += 1
      }
      while (i < balanceData.length) {
        balanceData[i].priceUnderlying =
          uniqueVaultHData[uniqueVaultHData.length - 1].priceUnderlying
        balanceData[i].sharePrice = uniqueVaultHData[uniqueVaultHData.length - 1].sharePrice
        mergedData.push(balanceData[i])
        i += 1
      }
    } else {
      let i = 0,
        z = 0,
        addFlag = false
      while (
        i < uniqueVaultHData.length &&
        uniqueVaultHData[i].timestamp > balanceData[0].timestamp
      ) {
        uniqueVaultHData[i].value = balanceData[0].value
        mergedData.push(uniqueVaultHData[i])
        i += 1
      }
      while (z < balanceData.length) {
        if (i < uniqueVaultHData.length) {
          while (uniqueVaultHData[i].timestamp >= balanceData[z].timestamp) {
            uniqueVaultHData[i].value = balanceData[z].value
            mergedData.push(uniqueVaultHData[i])
            i += 1
            if (i >= uniqueVaultHData.length) {
              break
            }
            if (!addFlag && uniqueVaultHData[i].timestamp === balanceData[z].timestamp) {
              addFlag = true
            }
          }
        }
        if (!addFlag) {
          balanceData[z].priceUnderlying =
            uniqueVaultHData[i === uniqueVaultHData.length ? i - 1 : i].priceUnderlying
          balanceData[z].sharePrice =
            uniqueVaultHData[i === uniqueVaultHData.length ? i - 1 : i].sharePrice
          mergedData.push(balanceData[z])
        }
        addFlag = false
        z += 1
      }
      while (i < uniqueVaultHData.length) {
        uniqueVaultHData[i].value = 0
        mergedData.push(uniqueVaultHData[i])
        i += 1
      }
      while (z < balanceData.length) {
        balanceData[z].priceUnderlying =
          uniqueVaultHData[uniqueVaultHData.length - 1].priceUnderlying
        balanceData[z].sharePrice = uniqueVaultHData[uniqueVaultHData.length - 1].sharePrice
        mergedData.push(balanceData[z])
        z += 1
      }
    }

    const filteredData = removeZeroValueObjects(mergedData)

    // Create a map to keep track of unique combinations of 'value' and 'sharePrice'
    const map = new Map()
    filteredData.forEach(item => {
      const key = `${item.value}_${item.sharePrice}`
      map.set(key, item)
    })

    // Convert the map back to an array
    uniqueData = Array.from(map.values())
    uniqueData.sort((a, b) => b.timestamp - a.timestamp)

    enrichedData = uniqueData
      .map((item, index, array) => {
        const nextItem = array[index + 1]
        let event, balance, netChange

        if (Number(item.value) === 0) {
          if (nextItem && Number(nextItem.value) === 0) {
            return false
          }
          balance = '0'
        } else {
          balance = Number(item.value) * Number(item.sharePrice)
        }

        if (nextItem) {
          if (Number(item.value) === Number(nextItem.value)) {
            event = 'Harvest'
          } else if (Number(item.value) > Number(nextItem.value)) {
            event = 'Convert'
          } else {
            event = 'Revert'
          }

          const nextBalance = Number(nextItem.value) * Number(nextItem.sharePrice)
          netChange = balance - nextBalance
        } else {
          event = 'Convert'
          netChange = balance
        }

        return {
          ...item,
          event,
          balance,
          netChange,
        }
      })
      .filter(Boolean)

    sumNetChange = enrichedData.reduce((sumValue, item) => {
      if (item.event === 'Harvest') {
        return sumValue + item.netChange
      }
      return sumValue
    }, 0)
    sumNetChangeUsd = Number(sumNetChange) * underlyingPrice

    enrichedData.forEach(item => {
      if (!lastUserEvent) {
        if (item.event === 'Harvest') {
          sumLatestNetChange += item.netChange
        } else if (item.event === 'Convert' || item.event === 'Revert') {
          lastUserEvent = true
        }
      }
    })
    sumLatestNetChangeUsd = Number(sumLatestNetChange) * underlyingPrice
  }

  return {
    balanceFlag,
    vaultHFlag,
    sumNetChange,
    sumNetChangeUsd,
    sumLatestNetChange,
    sumLatestNetChangeUsd,
    enrichedData,
  }
}

export const getTVLData = async (ago, address) => {
  let nowDate = new Date(),
    data = []
  nowDate = Math.floor(nowDate.setDate(nowDate.getDate() - 1) / 1000)
  const startDate = nowDate - 3600 * 24 * ago

  const api = `https://ethparser-api.herokuapp.com/api/transactions/history/tvl/${address}?reduce=1&start=${startDate}&network=eth`
  try {
    await fetch(api)
      .then(async res => {
        res = await res.json()
        if (res.length > 0) {
          data = res.map(a => {
            return [a.calculateTime, a.lastTvl]
          })
        }
      })
      .catch(err => {
        console.log(err)
      })
  } catch (err) {
    console.log('Fetch Chart Data error: ', err)
  }

  return data
}

// eslint-disable-next-line consistent-return
export const getTotalTVLData = async () => {
  try {
    const apiResponse = await axios.get(TOTAL_TVL_API_ENDPOINT)
    const apiData = get(apiResponse, 'data')
    return apiData
  } catch (err) {
    console.log(err)
  }
}

// /**
//  * @param symbol token symbol
//  * @param apiData coingeko data
//  * @dev get token id from api data
//  * ** */
// export function getTokenIdBySymbolInApiData(symbol, apiData) {
//   const symbol = symbol.toLowerCase();
//   for (let ids = 0; ids < apiData.length; ids += 1) {
//     const tempData = apiData[ids]
//     const tempSymbol = tempData.symbol
//     if (tempSymbol.toLowerCase() === symbol.toLowerCase()) {
//       return tempData.id
//     }
//   }
//   return null;
// }
