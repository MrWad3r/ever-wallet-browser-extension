import * as React from 'react'
import { useIntl } from 'react-intl'
import CopyToClipboard from 'react-copy-to-clipboard'
import { useForm } from 'react-hook-form'
import ReactTooltip from 'react-tooltip'

import * as nt from '@nekoton'
import Button from '@popup/components/Button'
import Input from '@popup/components/Input'
import { useAccountability } from '@popup/providers/AccountabilityProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { parseError } from '@popup/utils'

type Props = {
    onBack(): void
}

enum ExportSeedStep {
    PASSWORD_REQUEST,
    COPY_SEED_PHRASE,
}

export function ExportSeed({ onBack }: Props): JSX.Element {
    const intl = useIntl()
    const accountability = useAccountability()
    const rpc = useRpc()

    const { register, handleSubmit, formState } = useForm<{ password: string }>()

    const [error, setError] = React.useState<string>()
    const [inProcess, setInProcess] = React.useState(false)
    const [seedPhrase, setSeedPhrase] = React.useState<string[]>()
    const [step, setStep] = React.useState<ExportSeedStep>(ExportSeedStep.PASSWORD_REQUEST)

    const prepareExportKey = (entry: nt.KeyStoreEntry, password: string) => {
        switch (entry.signerName) {
            case 'encrypted_key':
                return {
                    type: entry.signerName,
                    data: {
                        publicKey: entry.publicKey,
                        password,
                    },
                } as nt.ExportKey
            case 'master_key':
                return {
                    type: entry.signerName,
                    data: {
                        masterKey: entry.masterKey,
                        password,
                    },
                } as nt.ExportKey
            case 'ledger_key':
                throw new Error('Unsupported operation')
        }
    }

    const onSubmit = async ({ password }: { password: string }) => {
        if (accountability.currentMasterKey == null) {
            return
        }

        setInProcess(true)

        try {
            await rpc
                .exportMasterKey(prepareExportKey(accountability.currentMasterKey, password))
                .then(({ phrase }) => {
                    setSeedPhrase(phrase.split(' '))
                    setStep(ExportSeedStep.COPY_SEED_PHRASE)
                })
                .catch((e: string) => {
                    setError(parseError(e))
                })
                .finally(() => {
                    setInProcess(false)
                })
        } catch (e: any) {
            setError(parseError(e))
        } finally {
            setInProcess(false)
        }
    }

    return (
        <>
            {step === ExportSeedStep.PASSWORD_REQUEST && (
                <div key="passwordRequest" className="accounts-management">
                    <header className="accounts-management__header">
                        <h2 className="accounts-management__header-title">
                            {intl.formatMessage({
                                id: 'EXPORT_SEED_PANEL_HEADER',
                            })}
                        </h2>
                    </header>

                    <div className="accounts-management__wrapper">
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <div className="accounts-management__content-form-rows">
                                <div className="accounts-management__content-form-row">
                                    <Input
                                        {...register('password', {
                                            required: true,
                                            minLength: 6,
                                        })}
                                        disabled={inProcess}
                                        label={intl.formatMessage({
                                            id: 'ENTER_SEED_PASSWORD_FIELD_PLACEHOLDER',
                                        })}
                                        type="password"
                                    />

                                    {(formState.errors.password || error) && (
                                        <div className="accounts-management__content-error">
                                            {formState.errors.password &&
                                                intl.formatMessage({
                                                    id: 'ERROR_PASSWORD_IS_REQUIRED_FIELD',
                                                })}
                                            {error}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </form>

                        <footer className="accounts-management__footer">
                            <div className="accounts-management__footer-button-back">
                                <Button
                                    text={intl.formatMessage({ id: 'BACK_BTN_TEXT' })}
                                    white
                                    onClick={onBack}
                                />
                            </div>
                            <Button
                                text={intl.formatMessage({ id: 'CONFIRM_BTN_TEXT' })}
                                onClick={handleSubmit(onSubmit)}
                            />
                        </footer>
                    </div>
                </div>
            )}

            {step == ExportSeedStep.COPY_SEED_PHRASE && (
                <div key="copySeedPhrase" className="accounts-management">
                    <header className="accounts-management__header">
                        <h2 className="accounts-management__header-title">
                            {intl.formatMessage({
                                id: 'SAVE_THE_SEED_PHRASE',
                            })}
                        </h2>
                    </header>

                    <div className="accounts-management__wrapper">
                        <div className="accounts-management__content">
                            <ol>
                                {seedPhrase?.map((item) => (
                                    <li key={item} className="accounts-management__content-word">
                                        {item.toLowerCase()}
                                    </li>
                                ))}
                            </ol>
                        </div>

                        <footer className="accounts-management__footer">
                            <div className="accounts-management__footer-button-back">
                                <Button
                                    text={intl.formatMessage({ id: 'BACK_BTN_TEXT' })}
                                    white
                                    onClick={onBack}
                                />
                            </div>
                            <div
                                data-tip={intl.formatMessage({ id: 'COPIED_TOOLTIP' })}
                                data-event="click focus"
                            >
                                <CopyToClipboard
                                    text={seedPhrase?.length ? seedPhrase.join(' ') : ''}
                                >
                                    <Button
                                        text={intl.formatMessage({
                                            id: 'COPY_ALL_WORDS_BTN_TEXT',
                                        })}
                                    />
                                </CopyToClipboard>
                                <ReactTooltip type="dark" effect="solid" place="top" />
                            </div>
                        </footer>
                    </div>
                </div>
            )}
        </>
    )
}
