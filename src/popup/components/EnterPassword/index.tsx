import React from 'react'
import { useIntl } from 'react-intl'
import { useForm } from 'react-hook-form'
import * as nt from '@nekoton'

import Input from '@popup/components/Input'
import Button from '@popup/components/Button'
import { Switcher } from '@popup/components/Switcher'

import './style.scss'

type Props = {
    keyEntry: nt.KeyStoreEntry
    minHeight?: string
    disabled?: boolean
    error?: string
    handleNext(password: string, cache: boolean): void
    handleBack(): void
}

export function EnterPassword({
    keyEntry,
    minHeight,
    disabled,
    error,
    handleNext,
    handleBack,
}: Props): JSX.Element {
    const intl = useIntl()
    const { register, handleSubmit, formState } = useForm<{ password: string }>()

    const [cache, setCache] = React.useState(false)

    const onSubmit = ({ password }: { password: string }) => {
        handleNext(password, cache)
    }

    return (
        <div className="enter-password">
            <div className="enter-password__content" style={{ minHeight }}>
                {keyEntry?.signerName === 'ledger_key' ? (
                    <div className="enter-password__content-pwd-form">
                        <div className="enter-password__content-pwd-form-ledger">
                            {intl.formatMessage({
                                id: 'APPROVE_ENTER_PASSWORD_DRAWER_CONFIRM_WITH_LEDGER',
                            })}
                        </div>
                        {error && <div className="error-message">{error}</div>}
                    </div>
                ) : (
                    <div className="enter-password__content-pwd-form">
                        <h2 className="enter-password__content-pwd-form-title">
                            {intl.formatMessage({ id: 'APPROVE_ENTER_PASSWORD_DRAWER_HEADER' })}
                        </h2>
                        <form id="password" onSubmit={handleSubmit(onSubmit)}>
                            <Input
                                {...register('password', {
                                    required: true,
                                    minLength: 6,
                                })}
                                label={intl.formatMessage({
                                    id: 'APPROVE_ENTER_PASSWORD_DRAWER_PASSWORD_FIELD_PLACEHOLDER',
                                })}
                                disabled={disabled}
                                autoFocus
                                type={'password'}
                            />
                            {(formState.errors.password || error) && (
                                <div className="check-seed__content-error">
                                    {formState.errors.password &&
                                        intl.formatMessage({
                                            id: 'ERROR_PASSWORD_IS_REQUIRED_FIELD',
                                        })}
                                    {error}
                                </div>
                            )}
                        </form>
                        <div className="accounts-management__passwords-cache noselect">
                            <Switcher
                                id="visibility"
                                checked={cache}
                                onChange={() => setCache(!cache)}
                            />
                            <label htmlFor="visibility">
                                {intl.formatMessage({
                                    id: 'APPROVE_PASSWORD_CACHE_SWITCHER_LABEL',
                                })}
                            </label>
                        </div>
                    </div>
                )}
            </div>
            <div className="enter-password__buttons">
                <div className="enter-password__buttons-button-back">
                    <Button
                        text={intl.formatMessage({ id: 'BACK_BTN_TEXT' })}
                        disabled={disabled}
                        onClick={() => handleBack()}
                        white
                    />
                </div>
                <Button
                    text={
                        keyEntry?.signerName === 'ledger_key'
                            ? intl.formatMessage({ id: 'CONFIRM_BTN_TEXT' })
                            : intl.formatMessage({ id: 'NEXT_BTN_TEXT' })
                    }
                    disabled={disabled}
                    onClick={handleSubmit(onSubmit)}
                />
            </div>
        </div>
    )
}
