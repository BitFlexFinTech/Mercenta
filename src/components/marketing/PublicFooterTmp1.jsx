          {/* Col 1 — Company */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src={logoLockup} alt={BRAND_LEGAL_NAME} className="h-8 rounded-md" />
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed mb-4">
              Self-service wholesale distribution platform connecting independent brands with UK retail channels.
            </p>
            <button onClick={onOpenPortal} className="text-xs font-medium bg-brass hover:bg-brass-600 text-ink px-4 py-1.5 rounded-lg transition-colors">
              Request Partner Access
            </button>
          </div>

          {/* Col 2 — Solutions */}
          <div>
            <h4 className="text-xs font-semibold text-parchment mb-3">Solutions &amp; Services</h4>
            <div className="space-y-1">
              <button onClick={() => onNavigate("how-it-works")} className={linkClass}>How It Works</button>
              <button onClick={() => onNavigate("uk-market-access")} className={linkClass}>UK Market Access</button>
              <button onClick={() => onNavigate("for-brands")} className={linkClass}>For Brands</button>
            </div>
          </div>
