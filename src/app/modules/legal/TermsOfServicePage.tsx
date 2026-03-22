type TermsOfServicePageProps = {
	onBackHome: () => void
}

export const TermsOfServicePage = ({ onBackHome }: TermsOfServicePageProps) => {
	return (
		<main className="legal-page">
			<div className="legal-page__container">
				<h1>Terms of Service</h1>
				<p>Last updated: March 22, 2026</p>
				<p>
					These Terms of Service govern your access to and use of Mini Weiqi. By using the service, you agree to these
					terms.
				</p>
				<h2>Eligibility and Accounts</h2>
				<p>
					You must be legally able to agree to these terms. You are responsible for activity associated with your
					account and for keeping your login credentials secure.
				</p>
				<h2>License and Acceptable Use</h2>
				<p>
					We grant you a limited, non-exclusive, revocable license to use the game for personal, non-commercial
					entertainment. You must not cheat, exploit bugs, reverse engineer the service, or disrupt other users.
				</p>
				<h2>Virtual Items and Purchases</h2>
				<p>
					Any virtual items, subscriptions, or in-app purchases are licensed, not sold. Availability and pricing may
					change. Except where required by law, purchases are non-refundable.
				</p>
				<h2>Service Availability</h2>
				<p>
					We may modify, suspend, or discontinue features at any time. We do not guarantee uninterrupted or error-free
					operation.
				</p>
				<h2>Termination</h2>
				<p>
					We may suspend or terminate access if you violate these terms or if needed to protect the service, users, or
					legal compliance.
				</p>
				<h2>Disclaimers and Limitation of Liability</h2>
				<p>
					The service is provided &quot;as is&quot; and &quot;as available.&quot; To the maximum extent permitted by law, we
					disclaim warranties and are not liable for indirect, incidental, special, or consequential damages.
				</p>
				<h2>Changes to Terms</h2>
				<p>
					We may update these terms from time to time. Continued use of the service after changes means you accept the
					updated terms.
				</p>
				<h2>Contact</h2>
				<p>
					For questions about these terms, contact <a href="mailto:szpura.maciej@gmail.com">szpura.maciej@gmail.com</a>.
				</p>
				<button className="legal-page__back-link" type="button" onClick={onBackHome}>
					Back to Home
				</button>
			</div>
		</main>
	)
}
