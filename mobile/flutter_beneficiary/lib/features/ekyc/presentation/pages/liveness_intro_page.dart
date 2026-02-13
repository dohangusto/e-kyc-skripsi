import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/colors.dart';
import '../../../../core/constants/dimens.dart';
import '../../../../core/constants/routes.dart';
import '../../../../core/widgets/primary_button.dart';
import '../../../../core/navigation/route_observer.dart';
import '../bloc/liveness/liveness_bloc.dart';
import '../bloc/liveness/liveness_event.dart';
import '../ekyc_progress_store.dart';
import '../widgets/ekyc_progress_footer.dart';

class LivenessIntroPage extends StatefulWidget {
  const LivenessIntroPage({super.key});

  @override
  State<LivenessIntroPage> createState() => _LivenessIntroPageState();
}

class _LivenessIntroPageState extends State<LivenessIntroPage> with RouteAware {
  Future<void> _startSession(BuildContext context) async {
    context.read<LivenessBloc>().add(const LivenessSessionStarted());
    await Navigator.of(context).pushNamed(AppRoutes.livenessGesture);
    if (!mounted) return;
    setState(() {});
  }

  Future<void> _openBottomSheet(BuildContext context, _EkycStep step) async {
    final steps = _ekycSteps();
    final canStart = _canStartStep(step, steps);
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      isDismissible: true,
      enableDrag: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.6,
          minChildSize: 0.25,
          maxChildSize: 0.95,
          builder: (context, scrollController) {
            return Container(
              decoration: const BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                boxShadow: [
                  BoxShadow(
                    color: Color(0x14000000),
                    blurRadius: 20,
                    offset: Offset(0, -8),
                  ),
                ],
              ),
              child: SingleChildScrollView(
                controller: scrollController,
                padding: const EdgeInsets.fromLTRB(
                  Dimens.spacing20,
                  Dimens.spacing12,
                  Dimens.spacing20,
                  Dimens.spacing24,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 42,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                    ),
                    const SizedBox(height: Dimens.spacing16),
                    Text(
                      step.title,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: Dimens.spacing8),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Expanded(
                          child: Text(
                            step.description,
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ),
                        const SizedBox(width: Dimens.spacing12),
                        SizedBox(
                          width: 120,
                          child: PrimaryButton(
                            label: 'Mulai',
                            onPressed: canStart
                                ? () async {
                                    EkycProgressStore.setStatus(
                                      step.id,
                                      EkycStepStatus.inProgress,
                                    );
                                    Navigator.of(context).pop();
                                    if (step.id == 'liveness') {
                                      _startSession(context);
                                      return;
                                    }
                                    await Navigator.of(
                                      context,
                                    ).pushNamed(step.route);
                                    if (!mounted) return;
                                    setState(() {});
                                  }
                                : null,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: Dimens.spacing12),
                    GridView.count(
                      crossAxisCount: 2,
                      childAspectRatio: 1.2,
                      shrinkWrap: true,
                      mainAxisSpacing: Dimens.spacing12,
                      crossAxisSpacing: Dimens.spacing12,
                      physics: const NeverScrollableScrollPhysics(),
                      children: [
                        for (final tip in step.tips)
                          _TipCard(icon: tip.icon, label: tip.label),
                      ],
                    ),
                    const SizedBox(height: Dimens.spacing12),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final route = ModalRoute.of(context);
    if (route is PageRoute) {
      routeObserver.subscribe(this, route);
    }
  }

  @override
  void dispose() {
    routeObserver.unsubscribe(this);
    super.dispose();
  }

  @override
  void didPopNext() {
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final steps = _ekycSteps();
    final totalSteps = steps.length;
    final completedCount = steps
        .where(
          (step) => EkycProgressStore.statusOf(step.id) == EkycStepStatus.done,
        )
        .length;
    final currentStep = completedCount >= totalSteps
        ? totalSteps
        : completedCount + 1;
    final canContinue = completedCount >= totalSteps;
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Registrasi'),
        centerTitle: false,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: Dimens.spacing12),
            child: Icon(Icons.help_outline),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(
                  Dimens.spacing16,
                  Dimens.spacing12,
                  Dimens.spacing16,
                  Dimens.spacing16,
                ),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 520),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Tahapan Proses untuk Memastikan Identitasmu',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: Dimens.spacing8),
                        const Text(
                          'Proses ini hanya memakan waktu sebentar saja.',
                          style: TextStyle(color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: Dimens.spacing20),
                        ...steps.map((step) {
                          final status = EkycProgressStore.statusOf(step.id);
                          final statusLabel = EkycProgressStore.labelFor(
                            status,
                          );
                          final statusColor = EkycProgressStore.colorFor(
                            status,
                          );
                          return Padding(
                            padding: const EdgeInsets.only(
                              bottom: Dimens.spacing12,
                            ),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(
                                Dimens.borderRadius12,
                              ),
                              onTap: () => _openBottomSheet(context, step),
                              child: Container(
                                padding: const EdgeInsets.all(Dimens.spacing12),
                                decoration: BoxDecoration(
                                  color: AppColors.surface,
                                  borderRadius: BorderRadius.circular(
                                    Dimens.borderRadius12,
                                  ),
                                  border: Border.all(
                                    color: Colors.black.withOpacity(0.08),
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 44,
                                      height: 44,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFE7F1FD),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Icon(
                                        step.icon,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                    const SizedBox(width: Dimens.spacing12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            step.title,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w700,
                                              color: AppColors.textPrimary,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            statusLabel,
                                            style: TextStyle(
                                              color: statusColor,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const Icon(
                                      Icons.chevron_right,
                                      color: AppColors.textSecondary,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        }),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                Dimens.spacing16,
                0,
                Dimens.spacing16,
                Dimens.spacing24,
              ),
              child: EkycProgressFooter(
                title: 'Verifikasi Identitas',
                currentStep: currentStep,
                totalSteps: totalSteps,
                labelPrefix: '',
                enableAction: canContinue,
                onAction: () => Navigator.of(
                  context,
                ).pushReplacementNamed(AppRoutes.ekycComplete),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TipCard extends StatelessWidget {
  final IconData icon;
  final String label;

  const _TipCard({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(Dimens.spacing8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(Dimens.borderRadius12),
        border: Border.all(color: Colors.black.withOpacity(0.08)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: AppColors.primary, size: 22),
          const SizedBox(height: Dimens.spacing8),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _Tip {
  final IconData icon;
  final String label;

  const _Tip({required this.icon, required this.label});
}

class _EkycStep {
  final String id;
  final String title;
  final String description;
  final String route;
  final IconData icon;
  final List<_Tip> tips;

  const _EkycStep({
    required this.id,
    required this.title,
    required this.description,
    required this.route,
    required this.icon,
    required this.tips,
  });
}

List<_EkycStep> _ekycSteps() {
  return const [
    _EkycStep(
      id: 'ktp',
      title: 'Foto KTP',
      description:
          'Siapkan KTP kamu untuk difoto. Pastikan data terlihat jelas.',
      route: AppRoutes.ktpCapture,
      icon: Icons.credit_card,
      tips: [
        _Tip(
          icon: Icons.crop_free,
          label: 'Pastikan seluruh KTP terlihat dalam frame',
        ),
        _Tip(
          icon: Icons.wb_sunny_outlined,
          label: 'Gunakan pencahayaan yang cukup terang',
        ),
        _Tip(
          icon: Icons.visibility_outlined,
          label: 'Hindari pantulan dan blur',
        ),
        _Tip(
          icon: Icons.text_fields,
          label: 'Nama dan NIK harus terbaca jelas',
        ),
      ],
    ),
    _EkycStep(
      id: 'identity',
      title: 'Identitas Diri',
      description:
          'Lengkapi data diri sesuai KTP untuk mempermudah verifikasi.',
      route: AppRoutes.identityForm,
      icon: Icons.badge_outlined,
      tips: [
        _Tip(
          icon: Icons.fact_check_outlined,
          label: 'Pastikan data sesuai dengan KTP',
        ),
        _Tip(
          icon: Icons.date_range_outlined,
          label: 'Isi tanggal lahir dengan benar',
        ),
        _Tip(
          icon: Icons.home_work_outlined,
          label: 'Cek kembali alamat domisili',
        ),
        _Tip(
          icon: Icons.contacts_outlined,
          label: 'Siapkan data kerabat dekat',
        ),
      ],
    ),
    _EkycStep(
      id: 'selfie',
      title: 'Selfi KTP',
      description:
          'Ambil selfie sambil memegang KTP untuk mencocokkan identitas.',
      route: AppRoutes.selfieWithKtp,
      icon: Icons.camera_alt_outlined,
      tips: [
        _Tip(
          icon: Icons.face_retouching_natural,
          label: 'Wajah dan KTP terlihat jelas',
        ),
        _Tip(
          icon: Icons.pan_tool_alt_outlined,
          label: 'Pegang KTP di samping wajah',
        ),
        _Tip(
          icon: Icons.wb_sunny_outlined,
          label: 'Gunakan pencahayaan yang cukup',
        ),
        _Tip(
          icon: Icons.no_flash_outlined,
          label: 'Hindari aksesori yang menutupi wajah',
        ),
      ],
    ),
    _EkycStep(
      id: 'liveness',
      title: 'Pengenalan Wajah',
      description:
          'Untuk keamanan akun yang optimal dan proses yang cepat, perhatikan hal-hal berikut:',
      route: AppRoutes.livenessGesture,
      icon: Icons.face_retouching_natural,
      tips: [
        _Tip(
          icon: Icons.sentiment_dissatisfied,
          label: 'Tidak menggunakan aksesori di area wajah',
        ),
        _Tip(icon: Icons.wifi, label: 'Pastikan koneksi internet stabil'),
        _Tip(
          icon: Icons.wb_sunny_outlined,
          label: 'Pastikan pencahayaan cukup cerah',
        ),
        _Tip(
          icon: Icons.face_retouching_natural,
          label: 'Pastikan wajah berada dalam area petunjuk',
        ),
      ],
    ),
  ];
}

bool _canStartStep(_EkycStep step, List<_EkycStep> steps) {
  final index = steps.indexWhere((s) => s.id == step.id);
  if (index <= 0) return true;
  final prev = steps[index - 1].id;
  return EkycProgressStore.statusOf(prev) == EkycStepStatus.done;
}
