import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/colors.dart';
import '../../../../core/constants/dimens.dart';
import '../../../../core/constants/routes.dart';
import '../ekyc_progress_store.dart';
import '../bloc/ktp_capture/ktp_capture_bloc.dart';
import '../bloc/ktp_capture/ktp_capture_event.dart';
import '../bloc/ktp_capture/ktp_capture_state.dart';
import '../widgets/camera_preview_widget.dart';
import '../widgets/ktp_frame_overlay.dart';

class KtpCapturePage extends StatefulWidget {
  const KtpCapturePage({super.key});

  @override
  State<KtpCapturePage> createState() => _KtpCapturePageState();
}

class _KtpCapturePageState extends State<KtpCapturePage> {
  @override
  void initState() {
    super.initState();
    if (EkycProgressStore.statusOf('ktp') != EkycStepStatus.done) {
      EkycProgressStore.setStatus('ktp', EkycStepStatus.inProgress);
    }
    context.read<KtpCaptureBloc>().add(const KtpCaptureStarted());
  }

  void _goNext() {
    final state = context.read<KtpCaptureBloc>().state;
    Navigator.of(
      context,
    ).pushReplacementNamed(AppRoutes.ktpPreview, arguments: state.photoPath);
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        EkycProgressStore.setStatus('ktp', EkycStepStatus.pending);
        return true;
      },
      child: BlocListener<KtpCaptureBloc, KtpCaptureState>(
        listener: (context, state) {
          if (state is KtpCaptureSuccess) {
            _goNext();
          }
        },
        child: Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            title: const Text('Ambil Foto KTP'),
            centerTitle: false,
            leading: IconButton(
              icon: const Icon(Icons.close),
              onPressed: () {
                EkycProgressStore.setStatus('ktp', EkycStepStatus.pending);
                Navigator.of(context).maybePop();
              },
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
                  child: Padding(
                    padding: const EdgeInsets.all(Dimens.spacing16),
                    child: Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 520),
                        child: BlocBuilder<KtpCaptureBloc, KtpCaptureState>(
                          builder: (context, state) {
                            return Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                CameraPreviewWidget(
                                  label:
                                      'Pastikan KTP di dalam area petunjuk dan hindari latar belakang biru.',
                                  overlay: const KtpFrameOverlay(),
                                  initialDirection: CameraLensDirection.back,
                                ),
                                if (state is KtpCaptureFailure) ...[
                                  const SizedBox(height: Dimens.spacing12),
                                  Container(
                                    padding: const EdgeInsets.all(
                                      Dimens.spacing12,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppColors.danger.withOpacity(0.08),
                                      borderRadius: BorderRadius.circular(
                                        Dimens.borderRadius12,
                                      ),
                                    ),
                                    child: Text(
                                      state.message,
                                      style: const TextStyle(
                                        color: AppColors.danger,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            );
                          },
                        ),
                      ),
                    ),
                  ),
                ),
                BlocBuilder<KtpCaptureBloc, KtpCaptureState>(
                  builder: (context, state) {
                    final isLoading = state is KtpCaptureInProgress;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: Dimens.spacing24),
                      child: GestureDetector(
                        onTap: isLoading
                            ? null
                            : () {
                                context.read<KtpCaptureBloc>().add(
                                  const KtpCaptureTakePhoto(),
                                );
                              },
                        child: Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.black12, width: 2),
                            boxShadow: const [
                              BoxShadow(
                                color: Colors.black26,
                                blurRadius: 10,
                                offset: Offset(0, 4),
                              ),
                            ],
                          ),
                          child: isLoading
                              ? const Center(
                                  child: SizedBox(
                                    width: 24,
                                    height: 24,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2.4,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        AppColors.primary,
                                      ),
                                    ),
                                  ),
                                )
                              : const SizedBox.shrink(),
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
