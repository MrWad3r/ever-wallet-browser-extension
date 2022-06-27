import * as React from 'react'
import { useIntl } from 'react-intl'
import * as nt from '@nekoton'

import manifest from '../../../manifest.json'

import { hideModalOnClick } from '@popup/common'
import { Step, useAccountability } from '@popup/providers/AccountabilityProvider'
import { Panel, useDrawerPanel } from '@popup/providers/DrawerPanelProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'
import { getScrollWidth } from '@popup/utils/getScrollWidth'

import Profile from '@popup/img/profile.svg'

import { convertAddress } from '@shared/utils'

import './style.scss'

const LOCALES = [
    { name: 'en', title: 'English' },
    { name: 'ko', title: '한국어' },
    { name: 'jp', title: '日本語' },
] as const

export function AccountModal() {
    const intl = useIntl()
    const accountability = useAccountability()
    const rpcState = useRpcState()
    const drawer = useDrawerPanel()
    const rpc = useRpc()

    const iconRef = React.useRef(null)
    const wrapperRef = React.useRef(null)

    const [isActive, setActiveTo] = React.useState(false)

    const scrollWidth = React.useMemo(() => getScrollWidth(), [])

    const selectedLocale = rpcState.state.selectedLocale || rpcState.state.defaultLocale

    const selectedSeedName = React.useMemo(() => {
        if (accountability.selectedMasterKey !== undefined) {
            return (
                accountability.masterKeysNames[accountability.selectedMasterKey] ||
                convertAddress(accountability.selectedMasterKey)
            )
        }
        return undefined
    }, [accountability.masterKeysNames, accountability.selectedMasterKey])

    const hide = () => {
        setActiveTo(false)
    }

    const toggle = () => {
        setActiveTo(!isActive)
    }

    const onSelectMaster = (masterKey: string) => {
        return async () => {
            const key = accountability.masterKeys.find((entry) => entry.masterKey === masterKey)
            if (key == null) {
                return
            }

            hide()

            if (key.masterKey === accountability.selectedMasterKey) {
                return
            }

            const derivedKeys = window.ObjectExt.values(rpcState.state.storedKeys)
                .filter((item) => item.masterKey === key.masterKey)
                .map((item) => item.publicKey)

            const availableAccounts: { [address: string]: nt.AssetsList } = {}

            window.ObjectExt.values(rpcState.state.accountEntries).forEach((account) => {
                const address = account.tonWallet.address
                if (
                    derivedKeys.includes(account.tonWallet.publicKey) &&
                    rpcState.state.accountsVisibility[address]
                ) {
                    availableAccounts[address] = account
                }
            })

            rpcState.state.externalAccounts.forEach(({ address, externalIn }) => {
                derivedKeys.forEach((derivedKey) => {
                    if (externalIn.includes(derivedKey)) {
                        const account = rpcState.state.accountEntries[address] as
                            | nt.AssetsList
                            | undefined
                        if (account != null && rpcState.state.accountsVisibility[address]) {
                            availableAccounts[address] = account
                        }
                    }
                })
            })

            const accounts = window.ObjectExt.values(availableAccounts).sort((a, b) => {
                if (a.name < b.name) return -1
                if (a.name > b.name) return 1
                return 0
            })

            if (accounts.length == 0) {
                accountability.setCurrentMasterKey(key)
                accountability.setStep(Step.MANAGE_SEED)
                drawer.setPanel(Panel.MANAGE_SEEDS)
            } else {
                await rpc.selectMasterKey(key.masterKey)
                await rpc.selectAccount(accounts[0].tonWallet.address)
                drawer.setPanel(undefined)
            }
        }
    }

    const onManageSeeds = async () => {
        hide()

        await rpc.openExtensionInExternalWindow({
            group: 'manage_seeds',
            width: 360 + scrollWidth - 1,
            height: 600 + scrollWidth - 1,
        })
    }

    const setLocale = (locale: string) => async (event: React.MouseEvent<HTMLAnchorElement>) => {
        try {
            event.preventDefault()
            event.stopPropagation()
            await rpc.setLocale(locale)
        } catch (e) {}
    }

    hideModalOnClick(wrapperRef, iconRef, hide)

    return (
        <>
            <div className="account-details__profile-icon" onClick={toggle} ref={iconRef}>
                <img src={Profile} alt="" />
            </div>

            {isActive && (
                <div ref={wrapperRef} className="account-settings noselect">
                    <div className="account-settings-section">
                        <div className="lang-switcher">
                            {LOCALES.map(({ name, title }) => (
                                <div key={name} className={selectedLocale === name ? 'active' : ''}>
                                    <a href="#" onClick={setLocale(name)}>
                                        {title}
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="account-settings-separator" />

                    <div className="account-settings-section">
                        <div className="account-settings-section-header">
                            {intl.formatMessage(
                                { id: 'ACCOUNT_CURRENT_ACCOUNT_PLACEHOLDER' },
                                {
                                    name: selectedSeedName ?? '',
                                }
                            )}
                        </div>
                    </div>

                    <div className="account-settings-separator" />

                    <div className="account-settings-section">
                        <div className="account-settings-section-header">
                            {intl.formatMessage({
                                id: 'ACCOUNT_RECENT_SEEDS_HEADER',
                            })}
                        </div>

                        <ul className="account-settings__seeds-list">
                            {accountability.recentMasterKeys
                                .filter((key) => key.masterKey != accountability.selectedMasterKey)
                                .map((key) => (
                                    <li key={key.masterKey}>
                                        <a
                                            role="button"
                                            className="account-settings__seeds-list-item"
                                            onClick={onSelectMaster(key.masterKey)}
                                        >
                                            <div className="account-settings__seeds-list-item-title">
                                                {accountability.masterKeysNames?.[key.masterKey] ||
                                                    convertAddress(key.masterKey)}
                                            </div>
                                        </a>
                                    </li>
                                ))}
                        </ul>

                        <div className="account-settings-section-item" onClick={onManageSeeds}>
                            {intl.formatMessage({
                                id: 'ACCOUNT_MANAGE_SEED_AND_ACCOUNT_LINK_TEXT',
                            })}
                        </div>
                    </div>

                    <div className="account-settings-separator" />

                    <div
                        className="account-settings-section-item-log-out"
                        onClick={accountability.logOut}
                    >
                        {intl.formatMessage({
                            id: 'ACCOUNT_LOGOUT_LINK_TEXT',
                        })}
                    </div>
                    <div className="account-settings-section-item-version">
                        {intl.formatMessage(
                            { id: 'EXTENSION_VERSION' },
                            { value: (manifest as any).version || '' }
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
