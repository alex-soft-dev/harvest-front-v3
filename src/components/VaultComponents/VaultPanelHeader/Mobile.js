import React, { useState, useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import { Modal } from 'react-bootstrap'
import { get } from 'lodash'
import { IFARM_TOKEN_SYMBOL, directDetailUrl } from '../../../constants'
import {
  PanelContainer, TokenLogoContainer, MobileVaultInfoContainer, MobileVaultValueContainer,
  FlexDiv, BadgeIcon, DetailModal,
} from './style'
import { tokens } from '../../../data'
import VaultName from './sub-components/VaultName'
import VaultApy from './sub-components/VaultApy'
import VaultValue from './sub-components/VaultValue'
import VaultUserBalance from './sub-components/VaultUserBalance'
import { getRewardsText, getTotalApy } from '../../../utils'
import { useVaults } from '../../../providers/Vault'
import APYIcon from '../../../assets/images/logos/farm/MobileAPYIcon.svg'
import DailyIcon from '../../../assets/images/logos/farm/MobileDailyIcon.svg'
import TVLIcon from '../../../assets/images/logos/farm/MobileTVLIcon.svg'
import POLYGON from '../../../assets/images/chains/polygon.svg'
import ARBITRUM from '../../../assets/images/chains/arbitrum.svg'
import ETHEREUM from '../../../assets/images/chains/ethereum.svg'
import BNB from '../../../assets/images/chains/bnb.svg'
import DetailClose from '../../../assets/images/logos/farm/farm-detail-close.svg'
import { useThemeContext } from '../../../providers/useThemeContext'


const chainList = [
  { id: 1, name: "Ethereum", chainId: 1},
  { id: 2, name: "Polygon", chainId: 137},
  { id: 3, name: "Arbitrum", chainId: 42161},
  { id: 4, name: "BNB", chainId: 56},
]

const MobilePanelHeader = ({
  token,
  tokenSymbol,
  vaultPool,
  useIFARM,
  isSpecialVault,
  multipleAssets,
  loadedVault,
  loadingFarmingBalance,
}) => { 
  const BadgeAry = [
    ETHEREUM,
    POLYGON,
    ARBITRUM,
    BNB
  ]
  
  const chainId = token.chain || token.data.chain;
  const [badgeId, setBadgeId] = useState(-1);

  const { push } = useHistory();

  useEffect(() => {
    const getBadge = () => {
      chainList.forEach((el, i)=>{
        if(el.chainId === Number(chainId)) {
          setBadgeId(i);
        }
      })
    }
    getBadge();
  }, [chainId]);

  // Detail Modal
  const [show, setShow] = useState(false)
  const handleClose = () => setShow(false)
  const handleShow = () => setShow(true)

  const { vaultsData } = useVaults()
  const tokenVault = get(vaultsData, token.hodlVaultId || tokenSymbol)
  const farmAPY = get(vaultPool, 'totalRewardAPY', 0)
  const tradingApy = get(vaultPool, 'tradingApy', 0)
  const boostedEstimatedAPY = get(tokenVault, 'boostedEstimatedAPY', 0)
  const boostedRewardAPY = get(vaultPool, 'boostedRewardAPY', 0)
  const totalApy = isSpecialVault
    ? getTotalApy(null, token, true)
    : getTotalApy(vaultPool, tokenVault)

  const logoUrl = useIFARM ? tokens[IFARM_TOKEN_SYMBOL].logoUrl : token.logoUrl

  const { badgeIconBackColor, fontColor, borderColor } = useThemeContext()
  return (
  <PanelContainer fontColor={fontColor} borderColor={borderColor}>
    <DetailModal className="vault-detail" show={show} onHide={handleClose}>
      <Modal.Header>
        Details
        <img src={DetailClose} onClick={handleClose} alt="" />
      </Modal.Header>
      <Modal.Body>
        {
          getRewardsText(
            token,
            tokens,
            vaultPool,
            tradingApy,
            farmAPY,
            totalApy,
            true,
            boostedEstimatedAPY,
            boostedRewardAPY,
          )
        }
      </Modal.Body>
    </DetailModal>
    <FlexDiv width="10%">
      <BadgeIcon badgeBack={badgeIconBackColor}>
        {
          BadgeAry[badgeId] ? 
            <img src={BadgeAry[badgeId]} width={"10"} height={"10"} alt="" />
            : <></>
        }
      </BadgeIcon>
    </FlexDiv>
    <FlexDiv width="70%" alignSelf="center" marginRight="18px" onClick={()=>{
      push(directDetailUrl + tokenSymbol)
    }}>
      <div>
      {
        logoUrl.map((el, i)=>(
          <img
            key={i}
            src={el}
            width={19}
            alt={tokenSymbol}
          />
        ))
      }
      </div>
      <div>
        <TokenLogoContainer>
          <VaultName
            token={token}
            tokenSymbol={tokenSymbol}
            useIFARM={useIFARM}
          />
        </TokenLogoContainer>
      </div>
    </FlexDiv>
    <FlexDiv width="20%">
      <MobileVaultInfoContainer>
        <MobileVaultValueContainer onClick={handleShow}>
          <VaultApy
            token={token}
            tokenSymbol={tokenSymbol}
            vaultPool={vaultPool}
            isSpecialVault={isSpecialVault}
            mobile
          />
          <div className="title">
            <img src={APYIcon} alt="" />
          </div>
        </MobileVaultValueContainer>
        <MobileVaultValueContainer>
          <VaultValue token={token} tokenSymbol={tokenSymbol} />
          <div className="title">
            <img src={TVLIcon} alt="" />
          </div>
        </MobileVaultValueContainer>
        <MobileVaultValueContainer>
          <VaultUserBalance
            token={token}
            tokenSymbol={tokenSymbol}
            multipleAssets={multipleAssets}
            isSpecialVault={isSpecialVault}
            loadingFarmingBalance={loadingFarmingBalance}
            vaultPool={vaultPool}
            loadedVault={loadedVault}
          />
          <div className="title">
            <img src={DailyIcon} alt="" />
          </div>
        </MobileVaultValueContainer>
      </MobileVaultInfoContainer>
    </FlexDiv>
  </PanelContainer>
)}

export default MobilePanelHeader
