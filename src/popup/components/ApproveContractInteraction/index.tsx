import React, { useState } from 'react'
import cn from 'classnames'
import { convertAddress, convertTons, findAccountByAddress } from '@shared/utils'
import { PendingApproval } from '@shared/backgroundApi'
import { prepareKey } from '@popup/utils'
import * as nt from '@nekoton'

import Button from '@popup/components/Button'

import Arrow from '@popup/img/arrow.svg'
import EnterPassword from '@popup/components/EnterPassword'
import SlidingPanel from '@popup/components/SlidingPanel'
import UserAvatar from '@popup/components/UserAvatar'
import WebsiteIcon from '@popup/components/WebsiteIcon'

interface IApproveContractInteraction {
    approval: PendingApproval<'callContractMethod'>
    networkName: string
    accountEntries: { [publicKey: string]: nt.AssetsList[] }
    storedKeys: { [publicKey: string]: nt.KeyStoreEntry }
    checkPassword: (password: nt.KeyPassword) => Promise<boolean>
    onSubmit: (password: nt.KeyPassword) => void
    onReject: () => void
}

const ApproveContractInteraction: React.FC<IApproveContractInteraction> = ({
    approval,
    networkName,
    accountEntries,
    storedKeys,
    checkPassword,
    onSubmit,
    onReject,
}) => {
    const { origin } = approval
    const { publicKey, recipient, payload } = approval.requestData

    const [inProcess, setInProcess] = useState(false)
    const [error, setError] = useState<string>()
    const [passwordModalVisible, setPasswordModalVisible] = useState<boolean>(false)

    const account = accountEntries[publicKey]?.[0] as nt.AssetsList | undefined
    if (account == null) {
        !inProcess && onReject()
        setInProcess(true)
        return null
    }

    const trySubmit = async (password: string) => {
        const keyEntry = storedKeys[publicKey]
        if (keyEntry == null) {
            setError('Key entry not found')
            return
        }

        setInProcess(true)
        try {
            const keyPassword = prepareKey(keyEntry, password)
            const isValid = await checkPassword(keyPassword)
            if (isValid) {
                onSubmit(keyPassword)
            } else {
                setError('Invalid password')
            }
        } catch (e) {
            setError(e.toString())
        } finally {
            setInProcess(false)
        }
    }

    return (
        <div className="connect-wallet">
            <div className="connect-wallet__spend-top-panel">
                <div className="connect-wallet__spend-top-panel__network">
                    <div className="connect-wallet__address-entry">
                        <UserAvatar address={account.tonWallet.address} small />
                        <div className="connect-wallet__spend-top-panel__account">
                            {account?.name}
                        </div>
                    </div>
                    <div className="connect-wallet__network" style={{ marginBottom: '0' }}>
                        {networkName}
                    </div>
                </div>
                <div className="connect-wallet__spend-top-panel__site">
                    <WebsiteIcon origin={origin} />
                    <div className="connect-wallet__address-entry">{origin}</div>
                </div>
                <h3 className="connect-wallet__spend-top-panel__header noselect">
                    Contract interaction
                </h3>
            </div>
            <div className="connect-wallet__spend-details">
                <div className="connect-wallet__details__description">
                    <div className="connect-wallet__details__description-param">
                        <span className="connect-wallet__details__description-param-desc">
                            Contract
                        </span>
                        <span className="connect-wallet__details__description-param-value">
                            {recipient}
                        </span>
                    </div>
                    {payload && (
                        <div className="connect-wallet__details__description-param">
                            <span className="connect-wallet__details__description-param-desc">
                                Data
                            </span>
                            <div className="connect-wallet__details__description-param-data">
                                <div className="connect-wallet__details__description-param-data__method">
                                    <span>Method:</span>
                                    <span>{payload.method}</span>
                                </div>
                                {Object.entries(payload.params).map(([key, value], i) => (
                                    <div
                                        className="connect-wallet__details__description-param-data__block"
                                        key={i}
                                    >
                                        <div className="connect-wallet__details__description-param-data__block--param-name">
                                            {key}
                                        </div>
                                        {value instanceof Array ? (
                                            <div className="connect-wallet__details__description-param-data__block--value">
                                                {JSON.stringify(value, undefined, 4)}
                                            </div>
                                        ) : (
                                            <div className="connect-wallet__details__description-param-data__block--value">
                                                {value.toString()}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="connect-wallet__buttons">
                <div className="connect-wallet__buttons-button">
                    <Button type="button" white text="Reject" onClick={onReject} />
                </div>
                <div className="connect-wallet__buttons-button">
                    <Button
                        type="submit"
                        text="Send"
                        onClick={() => {
                            setPasswordModalVisible(true)
                        }}
                    />
                </div>
            </div>
            <SlidingPanel
                isOpen={passwordModalVisible}
                onClose={() => setPasswordModalVisible(false)}
            >
                <EnterPassword
                    disabled={inProcess}
                    error={error}
                    handleNext={trySubmit}
                    handleBack={() => setPasswordModalVisible(false)}
                />
            </SlidingPanel>
        </div>
    )
}

export default ApproveContractInteraction
