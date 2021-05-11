import React from 'react'
import {
    convertAddress,
    convertTons,
    extractTransactionAddress,
    extractTransactionValue,
} from '@shared/utils'
import Decimal from 'decimal.js'
import * as nt from '@nekoton'

import Button from '@popup/components/Button'
import CopyAddress from '@popup/components/CopyAddress'

import './style.scss'

interface ITransactionInfo {
    transaction: nt.Transaction
}

const TRANSACTION_NAMES = {
    to: 'Recipient',
    service: 'Recipient',
    from: 'Sender',
}

const TransactionInfo: React.FC<ITransactionInfo> = ({ transaction }) => {
    const value = extractTransactionValue(transaction)
    const { direction, address } = extractTransactionAddress(transaction)

    const fee = new Decimal(transaction.totalFees)
    const total = value.sub(fee)

    const txHash = transaction.id.hash

    console.log(transaction, 'tramsaction')

    return (
        <>
            <h2 className="transaction-info-title">Transaction information</h2>
            <div className="transaction-info-tx-details">
                <div className="transaction-info-tx-details-param">
                    <span className="transaction-info-tx-details-param-desc">Date and time</span>
                    <span className="transaction-info-tx-details-param-value">
                        {new Date(transaction.createdAt * 1000).toLocaleString()}
                    </span>
                </div>
                <div className="transaction-info-tx-details-param">
                    <span className="transaction-info-tx-details-param-desc">Hash (ID)</span>
                    <CopyAddress address={txHash} />
                </div>
                <div className="transaction-info-tx-details-param">
                    <span className="transaction-info-tx-details-param-desc">
                        {TRANSACTION_NAMES[direction]}
                    </span>
                    <CopyAddress address={address} />
                </div>
                <div className="transaction-info-tx-details-separator" />
                <div className="transaction-info-tx-details-param">
                    <span className="transaction-info-tx-details-param-desc">Amount</span>
                    <span className="transaction-info-tx-details-param-value">
                        {convertTons(value.toString())}
                    </span>
                </div>
                <div className="transaction-info-tx-details-param">
                    <span className="transaction-info-tx-details-param-desc">Blockchain fee</span>
                    <span className="transaction-info-tx-details-param-value">
                        {convertTons(fee.toString())}
                    </span>
                </div>
                <div className="transaction-info-tx-details-param">
                    <span className="transaction-info-tx-details-param-desc">Total amount</span>
                    <span className="transaction-info-tx-details-param-value">
                        {convertTons(total.toString())}
                    </span>
                </div>
            </div>
            <Button
                white
                onClick={() =>
                    window.open(`https://ton-explorer.com/transactions/${txHash}`, '_blank')
                }
                text={'Open in explorer'}
            />
        </>
    )
}

export default TransactionInfo
