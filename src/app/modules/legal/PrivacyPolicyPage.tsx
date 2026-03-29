type PrivacyPolicyPageProps = {
	onBackHome: () => void
}

export const PrivacyPolicyPage = ({ onBackHome }: PrivacyPolicyPageProps) => {
	return (
		<main className="legal-page">
			<div className="legal-page__container">
				<h1>Privacy Policy</h1>
				<p>Last updated: March 22, 2026</p>
				<p>
					This Privacy Policy explains how Mini Weiqi (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) collects, uses,
					and protects information when you use our mobile game service.
				</p>
				<h2>Information We Collect</h2>
				<p>
					We may collect account identifiers (such as user ID and username), gameplay data, device and technical
					information, and limited diagnostic logs needed to keep the service running.
				</p>
				<h2>How We Use Information</h2>
				<p>
					We use collected information to provide core gameplay features, synchronize matches, improve performance,
					prevent abuse, and comply with legal obligations.
				</p>
				<h2>Data Sharing</h2>
				<p>
					We do not sell your personal information. We may share data with trusted service providers for hosting,
					analytics, and infrastructure support, and when required by law.
				</p>
				<h2>Data Retention</h2>
				<p>
					We keep data only as long as necessary to operate the game, resolve disputes, enforce agreements, and meet
					legal requirements.
				</p>
				<h2>Children&apos;s Privacy</h2>
				<p>
					Our service is not directed to children under 13 (or the applicable age in your region). If you believe a
					child provided personal data, contact us and we will take appropriate action.
				</p>
				<h2>Your Rights</h2>
				<p>
					Depending on your location, you may have rights to access, correct, delete, or restrict processing of your
					personal data.
				</p>
				<h2>Contact</h2>
				<p>
					For privacy questions, please contact us at{' '}
					<a href="mailto:szpura.maciej@gmail.com">szpura.maciej@gmail.com</a>.
				</p>
				<button className="legal-page__back-link" type="button" onClick={onBackHome}>
					Back to Home
				</button>
			</div>
		</main>
	)
}
