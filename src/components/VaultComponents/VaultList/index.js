import React, { useMemo, useRef, useState } from 'react'
import { find, get, isArray, isEqual, keys, orderBy, sortBy, uniq, debounce } from 'lodash'
import move from 'lodash-move'
import useEffectWithPrevious from 'use-effect-with-previous'
import { Dropdown } from 'react-bootstrap'
import BigNumber from 'bignumber.js'
import {
  FARM_TOKEN_SYMBOL,
  FARM_USDC_TOKEN_SYMBOL,
  FARM_WETH_TOKEN_SYMBOL,
  FARM_GRAIN_TOKEN_SYMBOL,
  IFARM_TOKEN_SYMBOL,
  SPECIAL_VAULTS,
} from '../../../constants'
import { useVaults } from '../../../providers/Vault'
import { useStats } from '../../../providers/Stats'
import { usePools } from '../../../providers/Pools'
import { useWallet } from '../../../providers/Wallet'
import { useThemeContext } from '../../../providers/useThemeContext'
import { Container, Header, HeaderCol, EmptyPanel, EmptyImg, EmptyInfo, FlexDiv, VaultsListBody, MobileListFilter, ThemeMode } from './style'
import VaultPanel from '../VaultPanel'
import VaultsListHeader from '../VaultsListHeader'
import {
  convertAmountToFARM,
  stringToArray,
  getTotalApy,
  getUserVaultBalance,
  getVaultValue,
} from '../../../utils'
import { CHAINS_ID, VAULT_CATEGORIES_IDS } from '../../../data/constants'
import EmptyIcon from '../../../assets/images/logos/farm/empty.svg'
import sortAscIcon from '../../../assets/images/ui/asc.svg'
import sortDescIcon from '../../../assets/images/ui/desc.svg'
import sortIcon from '../../../assets/images/ui/sort.svg'
import MobileFilterSortIcon from '../../../assets/images/chains/mobilesort.svg'

const { tokens } = require('../../../data')

const SortsList = [
  { id: 0, name: 'APY' },
  { id: 1, name: 'Daily' },
  { id: 2, name: 'TVL' },
]

const formatVaults = (
  groupOfVaults,
  pools,
  userStats,
  balances,
  farmingBalances,
  selChain,
  searchQuery = '',
  sortParam,
  sortOrder,
  selectedCategory,
  depositedOnly,
  selectAsset,
  selectStableCoin,
  selectFarmType
) => {
  let vaultsSymbol = sortBy(keys(groupOfVaults), [
    // eslint-disable-next-line consistent-return
    key => {
      if (get(groupOfVaults, `[${key}].isNew`, get(groupOfVaults, `[${key}].data.isNew`))) {
        return groupOfVaults[key]
      }
    },
    // eslint-disable-next-line consistent-return
    key => {
      if (
        !get(groupOfVaults, `[${key}].isNew`, get(groupOfVaults, `[${key}].data.isNew`)) &&
        stringToArray(groupOfVaults[key].category).includes(VAULT_CATEGORIES_IDS.GENERAL)
      ) {
        return groupOfVaults[key]
      }
    },
  ])

  if (selChain.includes(CHAINS_ID.ETH_MAINNET)) {
    const farmIdx = vaultsSymbol.findIndex(symbol => symbol === FARM_TOKEN_SYMBOL)
    vaultsSymbol = move(vaultsSymbol, farmIdx, 0)

    const wethIdx = vaultsSymbol.findIndex(symbol => symbol === 'WETH')
    vaultsSymbol = move(vaultsSymbol, wethIdx, 1)
  }

  vaultsSymbol = vaultsSymbol.filter(
    tokenSymbol =>
      tokenSymbol !== IFARM_TOKEN_SYMBOL &&
      (selChain.includes(groupOfVaults[tokenSymbol].chain) ||
        (groupOfVaults[tokenSymbol].data && selChain.includes(groupOfVaults[tokenSymbol].data.chain))),
  )

  if (searchQuery) {
    vaultsSymbol = vaultsSymbol.filter(
      symbol =>
        symbol.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (get(groupOfVaults[symbol], 'tokenAddress') &&
          !isArray(groupOfVaults[symbol].tokenAddress) &&
          groupOfVaults[symbol].tokenAddress.toLowerCase() === searchQuery.toLowerCase()) ||
        (get(groupOfVaults[symbol], 'displayName') &&
          groupOfVaults[symbol].displayName
            .toLowerCase()
            .includes(searchQuery.toLowerCase().trim())),
    )
  }

  if (sortParam) {
    switch (sortParam) {
      case 'displayName':
        vaultsSymbol = orderBy(
          vaultsSymbol,
          v => get(groupOfVaults, `${v}.${sortParam}`),
          sortOrder,
        )
        break
      case 'deposits':
        vaultsSymbol = orderBy(
          vaultsSymbol,
          v => Number(getVaultValue(groupOfVaults[v])),
          sortOrder,
        )
        break
      case 'apy':
        vaultsSymbol = orderBy(
          vaultsSymbol,
          v => {
            const isSpecialVault = groupOfVaults[v].liquidityPoolVault || groupOfVaults[v].poolVault

            const tokenVault = get(groupOfVaults, groupOfVaults[v].hodlVaultId || v)
            let vaultPool

            if (isSpecialVault) {
              vaultPool = groupOfVaults[v].data
            } else {
              vaultPool = find(
                pools,
                pool => pool.collateralAddress === get(tokenVault, `vaultAddress`),
              )
            }

            return Number(
              isSpecialVault
                ? getTotalApy(null, groupOfVaults[v], true)
                : getTotalApy(vaultPool, tokenVault),
            )
          },
          sortOrder,
        )
        break
      case 'balance':
        vaultsSymbol = orderBy(
          vaultsSymbol,
          v => {
            let iFARMinFARM, vaultPool

            if (v === FARM_TOKEN_SYMBOL) {
              const iFARMBalance = get(balances, IFARM_TOKEN_SYMBOL, 0)
              iFARMinFARM = convertAmountToFARM(
                IFARM_TOKEN_SYMBOL,
                iFARMBalance,
                tokens[FARM_TOKEN_SYMBOL].decimals,
                groupOfVaults,
              )
            }
            const isSpecialVault = groupOfVaults[v].liquidityPoolVault || groupOfVaults[v].poolVault

            const tokenVault = get(groupOfVaults, groupOfVaults[v].hodlVaultId || v)

            if (isSpecialVault) {
              vaultPool = groupOfVaults[v].data
            } else {
              vaultPool = find(
                pools,
                pool => pool.collateralAddress === get(tokenVault, `vaultAddress`),
              )
            }
            const poolId = get(vaultPool, 'id')
            const totalStakedInPool = get(userStats, `[${poolId}]['totalStaked']`, 0)
            return Number(getUserVaultBalance(v, farmingBalances, totalStakedInPool, iFARMinFARM))
          },
          sortOrder,
        )
        break
      default:
        break
    }
  }

  if (selectedCategory.length !== 0) {
    let result = []
    selectedCategory.map(item => {
      let temp = vaultsSymbol.filter(tokenSymbol => {
        if (
          item === VAULT_CATEGORIES_IDS.INACTIVE ||
          item === VAULT_CATEGORIES_IDS.INACTIVE_BSC ||
          item === VAULT_CATEGORIES_IDS.INACTIVE_POLYGON
          // || depositedOnly
        ) {
          return (
            stringToArray(groupOfVaults[tokenSymbol].category).includes(item) ||
            groupOfVaults[tokenSymbol].inactive ||
            groupOfVaults[tokenSymbol].testInactive
          )
        } else if (item === 'Active') {
          return !(
            stringToArray(groupOfVaults[tokenSymbol].category).includes(item) ||
            groupOfVaults[tokenSymbol].inactive ||
            groupOfVaults[tokenSymbol].testInactive
          )
        } else if (item === 'Deposited' && depositedOnly) {
          return stringToArray(groupOfVaults[tokenSymbol].category).includes(item)
        }
        return stringToArray(groupOfVaults[tokenSymbol].category).includes(item)
      })
      result = result.concat(temp)
      return result
    })
    vaultsSymbol = [...result]
  } else if (!depositedOnly && selChain.includes(CHAINS_ID.BSC_MAINNET)) {
    vaultsSymbol = vaultsSymbol.filter(
      tokenSymbol =>
        !groupOfVaults[tokenSymbol].inactive && !groupOfVaults[tokenSymbol].testInactive,
    )
  }

  if (depositedOnly) {
    const vaultsWithStakedBalances = Object.keys(userStats)
      .filter(
        poolId =>
          new BigNumber(userStats[poolId].totalStaked).gt(0) ||
          new BigNumber(userStats[poolId].lpTokenBalance).gt(0) ||
          (poolId === SPECIAL_VAULTS.NEW_PROFIT_SHARING_POOL_ID &&
            new BigNumber(balances[IFARM_TOKEN_SYMBOL]).gt(0)),
      )
      .map(poolId => {
        const selectedPool = find(pools, pool => pool.id === poolId)
        const collateralAddress = get(selectedPool, 'collateralAddress', poolId)

        const vaultSymbol = vaultsSymbol.find(
          tokenKey =>
            groupOfVaults[tokenKey].vaultAddress === collateralAddress ||
            (groupOfVaults[tokenKey].data &&
              groupOfVaults[tokenKey].data.collateralAddress === collateralAddress),
        )

        return vaultSymbol
      })

    vaultsSymbol = vaultsSymbol.filter(tokenSymbol =>
      vaultsWithStakedBalances.includes(tokenSymbol),
    )
  }

  if(selectAsset !== "") {
    vaultsSymbol = vaultsSymbol.filter(
      tokenSymbol =>
        groupOfVaults[tokenSymbol].assetType === selectAsset)
  }

  if(selectStableCoin) {
    vaultsSymbol = vaultsSymbol.filter(
      tokenSymbol =>
        groupOfVaults[tokenSymbol].stableCoin === selectStableCoin)
  }

  if(selectFarmType !== "") {
    vaultsSymbol = vaultsSymbol.filter(
      tokenSymbol =>
        groupOfVaults[tokenSymbol].farmType === selectFarmType)
  }

  return vaultsSymbol
}

const SortingIcon = ({ sortType, sortField, selectedField }) => {
  switch (true) {
    case sortType === 'asc' && selectedField === sortField:
      return <img className="sort-icon" src={sortAscIcon} alt="Sort ASC" />
    case sortType === 'desc' && selectedField === sortField:
      return <img className="sort-icon" src={sortDescIcon} alt="Sort DESC" />
    default:
      return <img className="sort-icon" src={sortIcon} alt="Sort" />
  }
}

const VaultList = () => {
  const {
    vaultsData,
    getFarmingBalances,
    loadedUserVaultsWeb3Provider,
    farmingBalances,
  } = useVaults()
  const { profitShareAPY } = useStats()
  const { pools, fetchUserPoolStats, userStats, loadedUserPoolsWeb3Provider } = usePools()
  const { account, chain, selChain, getWalletBalances, balances } = useWallet()
  const [openVault, setOpen] = useState(null)
  const [loaded, setLoaded] = useState(null)
  const [sortParam, setSortParam] = useState(null)
  const [sortOrder, setSortOrder] = useState('desc')
  const [selectedCategory, selectCategory] = useState([])
  const [depositedOnly, selectDepositedOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectAsset, onSelectAsset] = useState("")
  const [selectStableCoin, onSelectStableCoin] = useState(false)
  const [selectFarmType, onSelectFarmType] = useState("")

  const farmProfitSharingPool = pools.find(
    pool => pool.id === SPECIAL_VAULTS.NEW_PROFIT_SHARING_POOL_ID,
  )
  const farmUsdcPool = pools.find(pool => pool.id === SPECIAL_VAULTS.FARM_USDC_POOL_ID)
  const farmWethPool = pools.find(pool => pool.id === SPECIAL_VAULTS.FARM_WETH_POOL_ID)
  const farmGrainPool = pools.find(pool => pool.id === SPECIAL_VAULTS.FARM_GRAIN_POOL_ID)

  const poolVaults = useMemo(
    () => ({
      [FARM_TOKEN_SYMBOL]: {
        poolVault: true,
        profitShareAPY,
        data: farmProfitSharingPool,
        logoUrl: ['./icons/iFarm.svg'],
        rewardSymbol: FARM_TOKEN_SYMBOL,
        isNew: tokens[FARM_TOKEN_SYMBOL].isNew,
        newDetails: tokens[FARM_TOKEN_SYMBOL].newDetails,
        category: VAULT_CATEGORIES_IDS.GENERAL,
        assetType: 'Single Asset',
        stableCoin: false,
        farmType: 'Beginners'
      },
      [FARM_WETH_TOKEN_SYMBOL]: {
        liquidityPoolVault: true,
        displayName: 'FARM, ETH', //'FARM/ETH',
        subLabel: 'Uniswap',
        data: farmWethPool,
        logoUrl: ['./icons/farm.svg', './icons/weth.svg'],
        rewardSymbol: FARM_TOKEN_SYMBOL,
        isNew: tokens[FARM_WETH_TOKEN_SYMBOL].isNew,
        category: VAULT_CATEGORIES_IDS.LIQUIDITY,
        assetType: 'LP Token',
        stableCoin: false,
        farmType: 'Advanced',
      },
      [FARM_GRAIN_TOKEN_SYMBOL]: {
        liquidityPoolVault: true,
        displayName: 'FARM, GRAIN', //'FARM/GRAIN',
        subLabel: 'Uniswap',
        data: farmGrainPool,
        logoUrl: ['./icons/farm.svg', './icons/grain.svg'],
        rewardSymbol: FARM_TOKEN_SYMBOL,
        isNew: tokens[FARM_GRAIN_TOKEN_SYMBOL].isNew,
        category: VAULT_CATEGORIES_IDS.LIQUIDITY,
        assetType: 'LP Token',
        stableCoin: false,
        farmType: 'Advanced',
      },
      [FARM_USDC_TOKEN_SYMBOL]: {
        liquidityPoolVault: true,
        inactive: true,
        displayName: 'FARM/USDC',
        data: farmUsdcPool,
        logoUrl: ['./icons/farm.svg', './icons/usdc.svg'],
        rewardSymbol: FARM_TOKEN_SYMBOL,
        isNew: tokens[FARM_USDC_TOKEN_SYMBOL].isNew,
      },
    }),
    [
      farmGrainPool,
      farmWethPool,
      farmUsdcPool,
      farmProfitSharingPool,
      profitShareAPY,
    ],
  )

  const groupOfVaults = { ...vaultsData, ...poolVaults }

  const vaultsSymbol = useMemo(
    () =>
      formatVaults(
        groupOfVaults,
        pools,
        userStats,
        balances,
        farmingBalances,
        selChain,
        searchQuery,
        sortParam,
        sortOrder,
        selectedCategory,
        depositedOnly,
        selectAsset,
        selectStableCoin,
        selectFarmType
      ),
    [
      groupOfVaults,
      pools,
      userStats,
      balances,
      farmingBalances,
      selChain,
      searchQuery,
      sortParam,
      sortOrder,
      selectedCategory,
      depositedOnly,
      selectAsset,
      selectStableCoin,
      selectFarmType
    ],
  )

  const hasLoadedSpecialEthPools =
    !!get(farmUsdcPool, 'contractInstance') &&
    !!get(farmWethPool, 'contractInstance') &&
    !!get(farmGrainPool, 'contractInstance') &&
    !!get(farmProfitSharingPool, 'contractInstance')

  const firstPoolsBalancesLoad = useRef(true)
  const firstVaultsBalancesLoad = useRef(true)
  const firstFarmingBalancesLoad = useRef(true)

  useEffectWithPrevious(
    ([prevChain, prevAccount, prevOpenVault]) => {
      const hasSwitchedChain = chain !== prevChain
      const hasSwitchedChainToETH = hasSwitchedChain && chain === CHAINS_ID.ETH_MAINNET
      const hasSwitchedAccount = account !== prevAccount && account
      const hasSwitchedVault = openVault !== prevOpenVault

      if (hasSwitchedChain) {
        selectCategory([])
        onSelectAsset("")
        onSelectStableCoin(false)
        setOpen(null)
      }

      if (
        (hasSwitchedChainToETH || hasSwitchedAccount || firstPoolsBalancesLoad.current) &&
        loadedUserPoolsWeb3Provider &&
        hasLoadedSpecialEthPools
      ) {
        const fetchUserTotalStakedInFarmAndFarmUsdc = async () => {
          firstPoolsBalancesLoad.current = false
          await fetchUserPoolStats(
            [farmUsdcPool, farmWethPool, farmGrainPool, farmProfitSharingPool],
            account,
            userStats,
          )
        }

        fetchUserTotalStakedInFarmAndFarmUsdc()
      }

      if (
        (hasSwitchedVault ||
          hasSwitchedChain ||
          hasSwitchedAccount ||
          firstVaultsBalancesLoad.current) &&
        loadedUserVaultsWeb3Provider
      ) {
        const loadUserVaultBalances = async selectedVault => {
          let balancesToLoad = selectedVault ? [selectedVault] : []

          if (
            firstVaultsBalancesLoad.current &&
            !selectedVault &&
            selChain.includes(CHAINS_ID.ETH_MAINNET)
          ) {
            // firstVaultsBalancesLoad.current = false
            balancesToLoad = [
              FARM_TOKEN_SYMBOL,
              IFARM_TOKEN_SYMBOL,
              FARM_GRAIN_TOKEN_SYMBOL,
              FARM_WETH_TOKEN_SYMBOL,
            ]
          } else if (selectedVault) {
            if (isArray(tokens[selectedVault].tokenAddress)) {
              const multipleAssets = tokens[selectedVault].tokenAddress.map(address => {
                const selectedSymbol = Object.keys(tokens).find(
                  tokenSymbol =>
                    !isArray(tokens[tokenSymbol].tokenAddress) &&
                    tokens[tokenSymbol].tokenAddress.toLowerCase() === address.toLowerCase(),
                )
                return selectedSymbol
              })
              balancesToLoad = [...balancesToLoad, ...multipleAssets]
            }

            if (chain === CHAINS_ID.ETH_MAINNET) {
              balancesToLoad = [
                ...balancesToLoad,
                FARM_TOKEN_SYMBOL,
                IFARM_TOKEN_SYMBOL,
                FARM_GRAIN_TOKEN_SYMBOL,
                FARM_WETH_TOKEN_SYMBOL,
              ]
            }
          }

          if (balancesToLoad.length) {
            setLoaded(!!selectedVault)
            await getWalletBalances(uniq(balancesToLoad), account, true)
            setLoaded(true)
          }
        }

        loadUserVaultBalances(openVault)
      }
    },
    [
      chain,
      account,
      openVault,
      loadedUserPoolsWeb3Provider,
      loadedUserVaultsWeb3Provider,
      farmProfitSharingPool,
      farmUsdcPool,
      farmWethPool,
      farmGrainPool,
      fetchUserPoolStats,
      userStats,
      hasLoadedSpecialEthPools,
      selectCategory,
      onSelectAsset
    ],
  )

  useEffectWithPrevious(
    ([prevChain, prevAccount, prevUserStats]) => {
      const hasSwitchedChain = chain !== prevChain
      const hasSwitchedAccount = account !== prevAccount && account

      if (
        (hasSwitchedChain ||
          hasSwitchedAccount ||
          firstFarmingBalancesLoad.current ||
          (userStats && !isEqual(userStats, prevUserStats))) &&
        loadedUserVaultsWeb3Provider
      ) {
        setLoaded(false)
        const loadUserFarmingBalances = async () => {
          firstFarmingBalancesLoad.current = false
          await getFarmingBalances(vaultsSymbol)
          setLoaded(true)
        }
        loadUserFarmingBalances()
      }

      if(hasSwitchedAccount) {
        setSortingParams("balance")
      }
    },
    [chain, account, userStats],
  )

  const setSortingParams = param => {
    if (sortParam === param) {
      if (sortOrder === 'desc') {
        setSortOrder('asc')
      } else {
        setSortOrder('desc')
      }
    } else {
      setSortOrder('desc')
      setSortParam(param)
    }
  }

  const [sortId, setSortId] = useState(-1)

  const updateSortQuery = sort => {
    const debouncedFn = debounce(() => {
      if (sort === 'APY') setSortingParams('apy')
      else if (sort === 'DisplayName') setSortingParams('displayName')
      else if (sort === 'TVL') setSortingParams('deposits')
      else if (sort === 'Daily') setSortingParams('balance')
    }, 300)

    debouncedFn()
  }

  const { fontColor, filterColor, borderColor, backColor, mobileFilterBackColor, mobileFilterBorderColor, toggleBackColor,
    switchBalance, setSwitchBalance } = useThemeContext()

  const switchBalanceStyle = () => {
    setSwitchBalance(!switchBalance)
  }

  return (
    <Container id="vault-list">
      <VaultsListHeader
        setSearchQuery={setSearchQuery}
        onCategoryClick={selectCategory}
        onDepositedOnlyClick={selectDepositedOnly}
        depositedOnly={depositedOnly}
        selectedCategory={selectedCategory}
        onAssetClick={onSelectAsset}
        onSelectStableCoin={onSelectStableCoin}
        onSelectFarmType={onSelectFarmType}
      />
      <VaultsListBody borderColor={borderColor} backColor={backColor}>
        <MobileListFilter mobileBackColor={mobileFilterBackColor} backColor={backColor} borderColor={mobileFilterBorderColor} fontColor={fontColor}>
          <Dropdown className="filter-sort">
            <Dropdown.Toggle className="toggle">
              <div>
                <img className="sort" src={MobileFilterSortIcon} alt="" />
              </div>
              <div>Sort By: <b>{sortId === -1 ? '' : SortsList[sortId].name}</b></div>
              {/* <img className="narrow" src={DropDownNarrow} alt="" /> */}
            </Dropdown.Toggle>

            <Dropdown.Menu className="menu">
              {SortsList.map((item, i) => (
                <Dropdown.Item
                  className="item"
                  key={i}
                  onClick={() => {
                    setSortId(item.id)
                    updateSortQuery(item.name)
                  }}
                >
                  <div>{item.name}</div>
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
          {/* <div className='filter-sort'>
            <Filtersinput placeholder='Sort by: (ex: APY)' onChange={updateSortQuery} />
            <img src={MobileFilterSortIcon} alt="" />
          </div> */}
        </MobileListFilter>
        <Header fontColor={fontColor} filterColor={filterColor}>
          <HeaderCol width="30%"></HeaderCol>
          <HeaderCol
            justifyContent="start"
            width="15%"
            textAlign="right"
            // onClick={() => setSortingParams('displayName')}
          >
            <ThemeMode mode={switchBalance ? "usd" : "token"} backColor={toggleBackColor} borderColor={borderColor}>
              <div id="theme-switch">
                <div className="switch-track">
                  <div className="switch-thumb"></div>
                </div>

                <input
                  type="checkbox"
                  checked={switchBalance}
                  onChange={switchBalanceStyle}
                  aria-label="Switch between dark and light mode"
                />
              </div>
            </ThemeMode>
          </HeaderCol>
          <HeaderCol width="15%" textAlign="left" onClick={() => setSortingParams('apy')}>
            <div className="hoverable">APY</div>
            <SortingIcon className="sort-icon" sortType={sortOrder} sortField={sortParam} selectedField="apy" />
          </HeaderCol>
          <HeaderCol
            data-tip
            data-for="total-deposits-column-header"
            width="20%"
            textAlign="left"
            onClick={() => setSortingParams('deposits')}
          >
            <div className="hoverable">TVL</div>
            <SortingIcon className="sort-icon" sortType={sortOrder} sortField={sortParam} selectedField="deposits" />
          </HeaderCol>
          <HeaderCol onClick={() => setSortingParams('balance')} width="20%" textAlign="left">
            <div className="hoverable">My Balance </div>
            <SortingIcon className="sort-icon" sortType={sortOrder} sortField={sortParam} selectedField="balance" />
          </HeaderCol>
        </Header>
        <div>
          {vaultsSymbol.length > 0 ? (
            vaultsSymbol.map((vaultSymbol, i) => {
              const token = groupOfVaults[vaultSymbol]
              return (
                <VaultPanel
                  key={vaultSymbol}
                  loaded={loaded}
                  token={token}
                  tokenSymbol={vaultSymbol}
                  tokenNum={i}
                  vaultsCount={vaultsSymbol.length - 1}
                />
              )
            })
          ) : (
            <EmptyPanel fontColor={fontColor}>
              <FlexDiv>
                <EmptyImg src={EmptyIcon} alt="Empty" />
              </FlexDiv>
              <EmptyInfo
                weight={700}
                size={16}
                height={21}
                marginBottom={'28'}
              >
                There are no such farms.
              </EmptyInfo>
              <EmptyInfo
                weight={400}
                size={12}
                height={16}
                marginBottom={'10'}
              >
                Hey farmer, you might change or disable filters!
              </EmptyInfo>
            </EmptyPanel>
          )}
        </div>
      </VaultsListBody>
    </Container>
  )
}

export default VaultList
