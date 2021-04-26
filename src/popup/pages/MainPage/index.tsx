import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { AppState } from '@store/app/types'
import { logOut, startSubscription } from '@store/app/actions'
import { Step } from '@common'
import { Action } from '@utils'
import * as nt from '@nekoton'

import AccountDetails from '@components/AccountDetails'
import UserAssets from '@components/UserAssets'

import SlidingPanel from '@components/SlidingPanel'
import Receive from '@components/Receive'
import Send from '@components/Send'
import KeyStorage from '@components/KeyStorage'
import CreateAccountScreen from '../CreateAccount'
import AssetFull from '@components/AssetFull'

import './style.scss'
import DeployWallet from '@components/DeployWallet/DeployWallet'

interface IMainPage {
    account: nt.AssetsList | null
    tonWalletState: nt.AccountState | null
    transactions: nt.Transaction[]
    setStep: (step: Step) => void
    startSubscription: Action<typeof startSubscription>
    logOut: Action<typeof logOut>
}

enum Panel {
    RECEIVE,
    SEND,
    KEY_STORAGE,
    CREATE_ACCOUNT,
    ASSET,
    DEPLOY,
}

const MainPage: React.FC<IMainPage> = ({
    account,
    tonWalletState,
    transactions,
    setStep,
    startSubscription,
    logOut,
}) => {
    const [openedPanel, setOpenedPanel] = useState<Panel>()

    useEffect(() => {
        if (account != null) {
            startSubscription(account.tonWallet.address).then(() => {})
        }
    }, [])

    useEffect(() => {
        console.log(account, 'account')
    }, [account])

    if (account == null) {
        return null
    }

    const closePanel = () => setOpenedPanel(undefined)

    return (
        <>
            <AccountDetails
                account={account}
                tonWalletState={tonWalletState}
                onLogOut={async () => {
                    await logOut()
                    setStep(Step.WELCOME)
                }}
                onReceive={() => setOpenedPanel(Panel.RECEIVE)}
                onSend={() => setOpenedPanel(Panel.SEND)}
                onDeploy={() => setOpenedPanel(Panel.DEPLOY)}
                onCreateAccount={() => setOpenedPanel(Panel.CREATE_ACCOUNT)}
                onOpenKeyStore={() => setOpenedPanel(Panel.KEY_STORAGE)}
            />
            <UserAssets
                tonWalletState={tonWalletState}
                setActiveContent={setOpenedPanel}
                transactions={transactions}
            />
            <SlidingPanel isOpen={openedPanel != null} onClose={closePanel}>
                <>
                    {openedPanel == Panel.RECEIVE && (
                        <Receive accountName={account.name} address={account.tonWallet.address} />
                    )}
                    {openedPanel == Panel.SEND && tonWalletState && (
                        <Send
                            account={account}
                            tonWalletState={tonWalletState}
                            onBack={closePanel}
                        />
                    )}
                    {openedPanel == Panel.KEY_STORAGE && <KeyStorage />}
                    {openedPanel == Panel.CREATE_ACCOUNT && <CreateAccountScreen />}
                    {openedPanel == Panel.ASSET && <AssetFull handleSendReceive={() => {}} />}
                    {openedPanel == Panel.DEPLOY && (
                        <DeployWallet
                            account={account}
                            tonWalletState={tonWalletState}
                            onBack={closePanel}
                        />
                    )}
                </>
            </SlidingPanel>
        </>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    account: store.app.selectedAccount,
    tonWalletState: store.app.tonWalletState,
    transactions: store.app.transactions,
})

export default connect(mapStateToProps, {
    startSubscription,
    logOut,
})(MainPage)