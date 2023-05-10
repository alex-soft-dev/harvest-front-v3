import BigNumber from 'bignumber.js'
import CoinGecko from 'coingecko-api'
import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { quote, approve, getTokenAllowance } from 'wido'
import ArrowDownIcon from '../../../assets/images/logos/wido/arrowdown.svg'
import BackIcon from '../../../assets/images/logos/wido/back.svg'
import { WIDO_BALANCES_DECIMALS } from '../../../constants'
import { useThemeContext } from '../../../providers/useThemeContext'
import { useWallet } from '../../../providers/Wallet'
import { fromWei, mainWeb3, toWei } from '../../../services/web3'
import { formatNumberWido } from '../../../utils'
import AnimatedDots from '../../AnimatedDots'
import { Divider } from '../../GlobalStyle'
import WidoSwapToken from '../WidoSwapToken'
import { Buttons, CloseBtn, NewLabel, SelectTokenWido, IconArrowDown } from './style'
import ChevronRightIcon from '../../../assets/images/logos/wido/chevron-right.svg'
import IFARMIcon from '../../../assets/images/logos/wido/ifarm.svg'
import SettingIcon from '../../../assets/images/logos/wido/setting.svg'
import Swap2Icon from '../../../assets/images/logos/wido/swap2.svg'
import { CHAINS_ID } from '../../../data/constants'

const CoinGeckoClient = new CoinGecko()

const getPrice = async () => {
  try {
    const data = await CoinGeckoClient.simple.price({
      ids: ['ethereum'],
      /* eslint-disable camelcase */
      vs_currencies: ['usd'],
    })

    const result = data.success ? data.data.ethereum.usd : 1
    return result
  } catch (e) {
    return 1
  }
}

const WidoDepositStart = ({
  pickedToken,
  depositWido,
  setDepositWido,
  finalStep,
  setFinalStep,
  startRoutes,
  startSlippage,
  setStartSlippage,
  slippagePercentage,
  inputAmount,
  token,
  balanceList,
  symbol,
  tokenSymbol,
  useIFARM,
  quoteValue,
  setQuoteValue,
}) => {
  const { backColor, borderColor, filterColor } = useThemeContext()
  const { account } = useWallet()

  const chainId = token.chain || token.data.chain

  const amount = toWei(inputAmount, pickedToken.decimals)
  const [txFee, setTxFee] = useState(0)
  const [fromInfo, setFromInfo] = useState('')
  const [toInfo, setToInfo] = useState('')

  useEffect(() => {
    if (
      account &&
      pickedToken.symbol !== 'Select Token' &&
      !new BigNumber(amount).isEqualTo(0) &&
      depositWido &&
      balanceList.length !== 0
    ) {
      const getQuoteResult = async () => {
        setTxFee(0)
        setFromInfo('')
        setToInfo('')
        setQuoteValue(null)
        try {
          const fromChainId = chainId
          const fromToken = pickedToken.address
          const toToken = token.vaultAddress || token.tokenAddress
          const toChainId = chainId
          const user = account
          const quoteResult = await quote(
            {
              fromChainId, // Chain Id of from token
              fromToken, // Token address of from token
              toChainId, // Chain Id of to token
              toToken, // Token address of to token
              amount, // Token amount of from token
              slippagePercentage, // Acceptable max slippage for the swap
              user, // Address of user placing the order.
            },
            mainWeb3.currentProvider,
          )
          setQuoteValue(quoteResult)

          let curToken = balanceList.filter(itoken => itoken.symbol === pickedToken.symbol)
          curToken = curToken[0]

          const fromInfoTemp =
            formatNumberWido(
              fromWei(quoteResult.fromTokenAmount, curToken.decimals),
              WIDO_BALANCES_DECIMALS,
            ) +
            (quoteResult.fromTokenAmountUsdValue === null
              ? ''
              : ` ($${formatNumberWido(
                  fromWei(quoteResult.fromTokenAmount, curToken.decimals) *
                    quoteResult.fromTokenUsdPrice,
                  WIDO_BALANCES_DECIMALS,
                )})`)
          const toInfoTemp =
            formatNumberWido(
              fromWei(quoteResult.toTokenAmount, token.decimals || token.data.lpTokenData.decimals),
              WIDO_BALANCES_DECIMALS,
            ) +
            (quoteResult.toTokenAmountUsdValue === null
              ? ''
              : ` ($${formatNumberWido(
                  fromWei(
                    quoteResult.toTokenAmount,
                    token.decimals || token.data.lpTokenData.decimals,
                  ) * quoteResult.toTokenUsdPrice,
                  WIDO_BALANCES_DECIMALS,
                )})`)

          setFromInfo(fromInfoTemp)
          setToInfo(toInfoTemp)

          try {
            let gasFee = 0,
              fee = 0,
              price = 0

            const { allowance } = await getTokenAllowance({
              chainId,
              fromToken: pickedToken.address,
              toToken,
              accountAddress: account, // User
            })
            price = await getPrice()
            await mainWeb3.eth.getGasPrice().then(result => {
              gasFee = mainWeb3.utils.fromWei(result, 'ether')
              gasFee *= price
            })
            if (new BigNumber(allowance).gte(amount)) {
              fee = await mainWeb3.eth.estimateGas({
                from: quoteResult.from,
                to: quoteResult.to,
                data: quoteResult.data,
                value: quoteResult.value,
              })
            } else {
              const { data, to } = await approve({
                chainId,
                tokenAddress: pickedToken.address,
                amount,
              })
              if (chainId === CHAINS_ID.MATIC_MAINNET) {
                fee = await mainWeb3.eth.estimateGas({
                  from: account,
                  to,
                  data,
                })
              } else {
                fee = await mainWeb3.eth.estimateGas({
                  to,
                  data,
                })
              }
            }
            setTxFee(formatNumberWido(fee * gasFee, WIDO_BALANCES_DECIMALS))
          } catch (e) {
            toast.error('Failed to get transaction cost!')
            return
          }
        } catch (e) {
          toast.error('Failed to get quote!')
        }
      }

      getQuoteResult()
    }
  }, [
    account,
    amount,
    chainId,
    pickedToken,
    token,
    depositWido,
    slippagePercentage,
    balanceList,
    setQuoteValue,
  ])

  return (
    <SelectTokenWido
      show={depositWido && !finalStep && !startRoutes && !startSlippage}
      borderColor={borderColor}
      backColor={backColor}
    >
      <NewLabel
        display="flex"
        justifyContent="space-between"
        marginBottom="15px"
        weight="700"
        size="14px"
        height="18px"
        align="center"
      >
        <CloseBtn
          src={BackIcon}
          width={18}
          height={18}
          alt=""
          onClick={() => {
            setDepositWido(false)
          }}
          filterColor={filterColor}
        />
        You are about to swap
        <CloseBtn
          src={SettingIcon}
          width={18}
          height={18}
          alt=""
          onClick={() => {
            setStartSlippage(true)
          }}
        />
      </NewLabel>

      <NewLabel marginBottom="15px">
        <WidoSwapToken img={pickedToken.logoURI} name={fromInfo} value={pickedToken.symbol} />
        <NewLabel display="flex" justifyContent="center" marginBottom="15px" marginTop="15px">
          <IconArrowDown
            filterColor={filterColor}
            src={ArrowDownIcon}
            width={25}
            height={25}
            alt=""
          />
        </NewLabel>
        <WidoSwapToken
          img={useIFARM ? IFARMIcon : Swap2Icon}
          name={toInfo}
          value={useIFARM ? symbol : `f${tokenSymbol}`}
        />
      </NewLabel>

      <NewLabel marginBottom="15px">
        <Divider height="1px" backColor="#EAECF0" />
      </NewLabel>

      <NewLabel weight={400} size="14px" height="18px" marginBottom="20px" color="#475467">
        <NewLabel display="flex" justifyContent="space-between" marginBottom="15px">
          <NewLabel>Rate</NewLabel>
          <NewLabel display="flex" items="center">
            {quoteValue ? (
              <>
                1&nbsp;
                <img src={pickedToken.logoURI} width={20} height={20} alt="" />
                &nbsp;=&nbsp;
                {formatNumberWido(quoteValue.price, WIDO_BALANCES_DECIMALS)}
              </>
            ) : (
              <AnimatedDots />
            )}
          </NewLabel>
        </NewLabel>
        <NewLabel display="flex" justifyContent="space-between" marginBottom="15px">
          <NewLabel>Expected Output</NewLabel>
          <NewLabel weight={400} size="14px" height="18px" display="flex" items="center">
            {quoteValue ? (
              <>
                <img src={useIFARM ? IFARMIcon : Swap2Icon} width={20} height={20} alt="" />~
                {formatNumberWido(
                  fromWei(
                    quoteValue.toTokenAmount,
                    token.decimals || token.data.lpTokenData.decimals,
                  ),
                  WIDO_BALANCES_DECIMALS,
                )}
              </>
            ) : (
              <AnimatedDots />
            )}
          </NewLabel>
        </NewLabel>
        <NewLabel display="flex" justifyContent="space-between" marginBottom="15px">
          <NewLabel>Minimum Recieved</NewLabel>
          <NewLabel weight={400} size="14px" height="18px" display="flex" items="center">
            {quoteValue ? (
              <>
                <img src={useIFARM ? IFARMIcon : Swap2Icon} width={20} height={20} alt="" />
                &nbsp;~
                {formatNumberWido(
                  fromWei(
                    quoteValue.minToTokenAmount,
                    token.decimals || token.data.lpTokenData.decimals,
                  ),
                  WIDO_BALANCES_DECIMALS,
                )}
              </>
            ) : (
              <AnimatedDots />
            )}
          </NewLabel>
        </NewLabel>
        <NewLabel display="flex" justifyContent="space-between">
          <NewLabel>Transaction cost</NewLabel>
          <NewLabel weight={400} size="14px" height="18px">
            {txFee === 0 ? <AnimatedDots /> : <>~${txFee}</>}
          </NewLabel>
        </NewLabel>
      </NewLabel>

      <NewLabel size="16px" height="21px" weight={500} color="#1F2937">
        <Buttons
          color="continue"
          onClick={() => {
            setFinalStep(true)
          }}
        >
          Continue Deposit
          <img src={ChevronRightIcon} alt="" />
        </Buttons>
      </NewLabel>
    </SelectTokenWido>
  )
}
export default WidoDepositStart
