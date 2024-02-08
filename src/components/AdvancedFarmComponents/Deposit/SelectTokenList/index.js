import React, { useEffect, useState } from 'react'
import { fromWei } from '../../../../services/web3'
import { useThemeContext } from '../../../../providers/useThemeContext'
import {
  Container,
  Text,
  Vault,
  Content,
  EmptyContainer,
  Label,
  RightText,
  TextSpan,
} from './style'
import AnimatedDots from '../../../AnimatedDots'

const SelectTokenList = ({
  balanceList,
  supTokenNoBalanceList,
  defaultToken,
  soonToSupList,
  setPickedToken,
  setBalance,
  setSelectToken,
  filterWord,
}) => {
  const [showList, setShowList] = useState(false)

  // Supported Token with no balance
  const [supTokenList, setSupTokenList] = useState(supTokenNoBalanceList)
  const [clicksupTokenNoBalanceListId, setClickSupTokenNoBalanceListId] = useState(-1)
  const handleSupTokenNoBalanceListClick = id => {
    setClickSupTokenNoBalanceListId(id)
    setPickedToken(supTokenList[id])
    setBalance(supTokenList[id].balance ? supTokenList[id].balance : 0)
    setSelectToken(false)
  }

  // Supported token with balance in my wallet
  const [balanceTokenList, setBalanceTokenList] = useState(balanceList)
  const [clickBalanceListId, setClickBalanceListId] = useState(-1)
  const handleBalanceListClick = id => {
    setClickBalanceListId(id)
    setPickedToken(balanceTokenList[id])
    setBalance(
      balanceTokenList[id].balance
        ? fromWei(
            balanceTokenList[id].rawBalance,
            balanceTokenList[id].decimals,
            balanceTokenList[id].decimals,
          )
        : 0,
    )
    setSelectToken(false)
  }

  // Default Token
  const handleDefaultToken = () => {
    setClickBalanceListId(-1)
    setClickSupTokenNoBalanceListId(-1)
    setPickedToken(defaultToken)
    setBalance(defaultToken.balance ? defaultToken.balance : 0)
    setSelectToken(false)
  }

  const [defaultCurToken, setDefaultCurToken] = useState(defaultToken)

  useEffect(() => {
    if (supTokenNoBalanceList && balanceList && filterWord !== undefined && filterWord !== '') {
      if (supTokenNoBalanceList.length !== 0) {
        const newList = supTokenNoBalanceList.filter(el =>
          el.symbol.toLowerCase().includes(filterWord.toLowerCase().trim()),
        )
        setSupTokenList(newList)
      }
      if (!(Object.keys(defaultToken).length === 0 && defaultToken.constructor === Object)) {
        if (defaultToken.symbol.includes(filterWord.toLowerCase().trim())) {
          setDefaultCurToken(defaultToken)
        } else {
          setDefaultCurToken(null)
        }
      }
      if (balanceList.length !== 0) {
        const newList = balanceList.filter(el =>
          el.symbol.toLowerCase().includes(filterWord.toLowerCase().trim()),
        )
        setBalanceTokenList(newList)
      }
    }
    if (filterWord === '') {
      setSupTokenList(supTokenNoBalanceList)
      setBalanceTokenList(balanceList)
      setDefaultCurToken(defaultToken)
    }
  }, [filterWord, supTokenNoBalanceList, balanceList]) // eslint-disable-line react-hooks/exhaustive-deps

  const { fontColor } = useThemeContext()

  useEffect(() => {
    const count =
      defaultToken &&
      !(Object.keys(defaultToken).length === 0 && defaultToken.constructor === Object)
        ? 1
        : 0 +
          (balanceList && balanceList.length) +
          (supTokenNoBalanceList && supTokenNoBalanceList.length) +
          (soonToSupList && soonToSupList.length)
    if (count > 0) {
      setShowList(true)
    }
  }, [defaultToken, balanceList, supTokenNoBalanceList, soonToSupList])

  return (
    <>
      {showList ? (
        <Content>
          {defaultCurToken &&
            !(
              Object.keys(defaultCurToken).length === 0 && defaultCurToken.constructor === Object
            ) && (
              <>
                <Label padding="15px 24px 0px">Default token </Label>
                <Container
                  onClick={() => {
                    handleDefaultToken()
                  }}
                  hoverColor="#F2F5FF"
                  activeColor="#ECFDF3"
                >
                  <img src={defaultCurToken.logoURI} width={26} height={26} alt="" />
                  <Vault>
                    <Text weight={600} color="#344054">
                      {defaultCurToken.symbol}
                    </Text>
                    <RightText weight={600} color="#344054">
                      <>{defaultCurToken.balance ? defaultCurToken.balance : '0.00'}</>
                      <TextSpan>
                        {defaultCurToken.usdValue ? `$${defaultCurToken.usdValue}` : '$0.00'}
                      </TextSpan>
                    </RightText>
                  </Vault>
                </Container>
              </>
            )}
          {balanceTokenList.length > 0 && (
            <>
              <Label padding="0px 24px">Supported tokens in your wallet</Label>
              {balanceTokenList.map((data, i) => (
                <Container
                  key={i}
                  className={i === clickBalanceListId ? 'active' : ''}
                  onClick={() => {
                    handleBalanceListClick(i)
                  }}
                  hoverColor="#F2F5FF"
                  activeColor="#ECFDF3"
                >
                  <img src={data.logoURI} width={26} height={26} alt="" />
                  <Vault>
                    <Text weight={600} color="#344054">
                      {data.symbol}
                    </Text>
                    <RightText weight={600} color="#344054">
                      <>{data.balance ? data.balance : '0.00'}</>
                      <TextSpan>{data.usdValue ? `$${data.usdValue}` : '$0.00'}</TextSpan>
                    </RightText>
                  </Vault>
                </Container>
              ))}
            </>
          )}
          {supTokenList.length > 0 && (
            <>
              <Label padding="0px 24px">
                Other supported convert tokens, which you don&apos;t have on your wallet
              </Label>
              {supTokenList.map((data, i) => (
                <Container
                  key={i}
                  className={i === clicksupTokenNoBalanceListId ? 'active' : ''}
                  onClick={() => {
                    handleSupTokenNoBalanceListClick(i)
                  }}
                  hoverColor="#F2F5FF"
                  activeColor="#ECFDF3"
                >
                  <img src={data.logoURI} width={26} height={26} alt="" />
                  <Vault>
                    <Text weight={600} color="#344054">
                      {data.symbol}
                    </Text>
                    <RightText weight={600} color="#344054">
                      <>{data.balance ? data.balance : '0.00'}</>
                      <TextSpan>$0</TextSpan>
                    </RightText>
                  </Vault>
                </Container>
              ))}
            </>
          )}
          {soonToSupList.length > 0 && (
            <>
              <Label padding="0px 24px">Soon to be supported</Label>
              {soonToSupList.map((data, i) => (
                <Container key={i} hoverColor="#F2F5FF" activeColor="#ECFDF3">
                  <img src={data.logoURI} width={26} height={26} alt="" />
                  <Vault>
                    <Text weight={600} color="#344054">
                      {data.symbol}
                    </Text>
                    <RightText weight={600} color="#344054">
                      <>{data.balance ? `${1 * fromWei(data.balance, data.decimals)}` : '0.00'}</>
                      <TextSpan>$0</TextSpan>
                    </RightText>
                  </Vault>
                </Container>
              ))}
            </>
          )}
        </Content>
      ) : (
        <EmptyContainer fontColor={fontColor}>
          Loading Token list
          <AnimatedDots />
        </EmptyContainer>
      )}
    </>
  )
}
export default SelectTokenList