import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/colors.dart';
import '../../../../core/constants/dimens.dart';
import '../../../../core/constants/routes.dart';
import '../../../../core/widgets/primary_button.dart';
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
    context.read<KtpCaptureBloc>().add(const KtpCaptureStarted());
  }

  void _goNext() {
    Navigator.of(context).pushReplacementNamed(AppRoutes.selfieIntro);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Foto KTP')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(Dimens.spacing16),
          child: LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: IntrinsicHeight(
                    child: Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 520),
                        child: BlocBuilder<KtpCaptureBloc, KtpCaptureState>(
                          builder: (context, state) {
                            final isLoading = state is KtpCaptureInProgress;
                            final isSuccess = state is KtpCaptureSuccess;
                            final isFailure = state is KtpCaptureFailure;

                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                CameraPreviewWidget(
                                  label: isSuccess
                                      ? 'Foto KTP sudah diambil'
                                      : 'Arahkan KTP kamu di sini',
                                  overlay: const KtpFrameOverlay(),
                                ),
                                const SizedBox(height: Dimens.spacing16),
                                if (isFailure)
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
                                      (state as KtpCaptureFailure).message,
                                      style: const TextStyle(
                                        color: AppColors.danger,
                                      ),
                                    ),
                                  ),
                                const SizedBox(height: Dimens.spacing24),
                                if (!isSuccess)
                                  PrimaryButton(
                                    label: isLoading
                                        ? 'Memproses...'
                                        : 'Ambil foto KTP',
                                    onPressed: isLoading
                                        ? null
                                        : () {
                                            context.read<KtpCaptureBloc>().add(
                                              const KtpCaptureTakePhoto(),
                                            );
                                          },
                                    isLoading: isLoading,
                                  )
                                else
                                  Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.stretch,
                                    children: [
                                      PrimaryButton(
                                        label: 'Lanjut',
                                        onPressed: _goNext,
                                      ),
                                      const SizedBox(height: Dimens.spacing12),
                                      OutlinedButton(
                                        onPressed: () {
                                          context.read<KtpCaptureBloc>().add(
                                            const KtpCaptureStarted(),
                                          );
                                        },
                                        child: const Text('Ulangi'),
                                      ),
                                    ],
                                  ),
                                const SizedBox(height: Dimens.spacing24),
                              ],
                            );
                          },
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
