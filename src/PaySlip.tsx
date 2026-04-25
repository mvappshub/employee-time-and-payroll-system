import { usePaySlipScreen } from './application/usePaySlipScreen'
import { PaySlipView } from './screens/payslip/PaySlipView'
import { printDocumentById } from './screens/documents/print'

export default function PaySlip() {
  const screen = usePaySlipScreen()

  return (
    <PaySlipView
      month={screen.month}
      employeeHeader={screen.employeeHeader}
      loading={screen.loading}
      error={screen.error}
      info={screen.info}
      blocked={screen.blocked}
      blockedMessage={screen.blockedMessage}
      isDataClosed={screen.isDataClosed}
      printDisabled={screen.printDisabled}
      dataClosedWarning={screen.dataClosedWarning}
      internalInputs={screen.internalInputs}
      auditRows={screen.auditRows}
      issuedPayslipDocument={screen.issuedPayslipDocument}
      issuedDocumentRows={screen.issuedDocumentRows}
      issuedDocumentTimeRows={screen.issuedDocumentTimeRows}
      employmentTypeLabel={screen.employmentTypeLabel}
      onMonthChange={screen.onMonthChange}
      onPrintDocument={() => printDocumentById('issued-payslip-document')}
    />
  )
}
